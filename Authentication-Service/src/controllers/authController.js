import authService from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { registerValidator } from '../validators/authValidator.js';
import redis, { isBlacklisted } from '../middleware/redisClient.js';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/AsyncHandler.js';
import { hash } from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import { parseFormData } from '../utils/parseFormData.js';
import { getImageUrl } from '../utils/getImageUrl.js';
import mongoose from 'mongoose';
dotenv.config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function googleLogin(req, res) {
    try {
        console.log("API HIT ")
        const { id_token } = req.body;
        if (!id_token) {
            return res.status(400).json({ message: "id token is not provided" });
        }
        const ticket = await client.verifyIdToken({
            idToken: id_token,
            // audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload(); // gives email, name, etc
        console.log(payload);
        const { email, name } = payload;
        if (!email || !name) {
            return res.status(400).json({ message: "email or name were not allowed" });
        }
        const result = await authService.googleAuth(email, name, id_token)

        return res.status(200).json({ result })
    } catch (err) {
        console.log(err.message)
        res.status(500).json({ error: "Internal server error" });

    }
}
export async function register(req, res) {
    try {
        const { email, password, name, role } = req.body;

        // Validate input using Joi
        const { error } = registerValidator.validate({ email, password, name, role });
        if (error) {


            throw new ApiError(
                402,
                "Validation Failed",
                error.details.map(detail => detail.message)
            );
        }

        // Custom password check
        if (password.length < 6) {
            throw new ApiError(402, "Password is too weak", ["Password must be at least 6 characters long"]);
        }

        // Call service to register
        const result = await authService.register(email, password, role, name);

        if (result) {
            console.log("INSIDE RESULT");
            return res.status(201).json({
                success: true,
                message: `Otp has been sent to ${email ?? ''}`,
            });
        }

        return res.status(400).json({
            success: false,
            message: "Could not send email",
        });

    } catch (err) {
        if (err instanceof ApiError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                errors: err.errors,
                data: err.data
            });
        }
        console.log(err.message);
        // Unexpected error
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            errors: [],
            data: null
        });
    }
}
export async function verifyOtp(req, res) {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            throw new ApiError(400, "Email or OTP is not provided!");
        }

        const result = await authService.verifyOTP(email, otp);

        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || true,
            sameSite: 'strict',
            maxAge: 3 * 24 * 60 * 60 * 1000,
        });

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || true,
            sameSite: 'strict',
            maxAge: 15 * 24 * 60 * 60 * 1000,
        });
        return res.status(201).json(new ApiResponse(200, result));
    } catch (err) {
        // Instead of re-throwing, send the response
        const statusCode = err instanceof ApiError ? err.statusCode : 500;
        const message = err.message || "Internal Server Error";
        return res.status(statusCode).json({
            success: false,
            message,
            errors: err.errors || [],
            data: null,
        });
    }
}
export async function login(req, res) {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.cookie('accessToken', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || true,
            sameSite: 'strict',
            maxAge: 3 * 24 * 60 * 60 * 1000, // 3 minutes
        });

        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || true,
            sameSite: 'strict',
            maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
        });
        res.status(200).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}
export async function refreshToken(req, res) {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
            throw new ApiError(401, "Refresh token not found");
        }
        console.log(refreshToken);
        if (await isBlacklisted(refreshToken)) {
            throw new Error('Invalid refresh token (blacklisted)');
        }
        const tokens = await authService.refresh(refreshToken);

        res.cookie('accessToken', tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || true,
            sameSite: 'strict',
            maxAge: 3 * 24 * 60 * 60 * 1000, // 3 minutes
        });

        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' || true,
            sameSite: 'strict',
            maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
        });
        res.status(200).json(tokens);
    } catch (err) {
        res.status(401).json({ error: err.message });
    }
}
export async function logout(req, res) {
    try {
        const { _id: id } = req.user;

        // const userId = req.user._id; 
        if (!id) {
            throw new ApiError(401, "unauthorized request")
        }

        const oldUser = await authService.logout(id);
        console.log("good")
        if (!oldUser) {
            throw new ApiError(401, "Invalid user id")
        }
        console.log(oldUser)
        // ✅ Blacklist the token in Redis until it would naturally expire

        if (!oldUser.refreshToken) {
            throw new ApiError(400, "User already logged out")
        }

        const payload = jwt.verify(oldUser.refreshToken, process.env.REFRESH_TOKEN_SECRET);

        const expiresIn = payload.exp - Math.floor(Date.now() / 1000); // in seconds

        await redis.set(`bl:${refreshToken}`, 'true', 'EX', expiresIn);
        // 🧼 Clear cookies by setting them to empty and `maxAge: 0`
        res.cookie('accessToken', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0,
        });

        res.cookie('refreshToken', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0,
        });

        return res.status(202).json(new ApiResponse(200, "Logged out successfully!")); // No Content
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

export const updateUser = asyncHandler(async (req, res) => {

    console.log("HIT UPDATE USER")
    const data = parseFormData(req);
    const { _id: id } = req.user;

    const file = req?.file;




    if (!id) {
        throw new ApiError(400, "User ID not provided");
    }

    if (!data || Object.keys(data).length === 0) {
        throw new ApiError(400, "No update data provided");
    }
    if (file) {
        const imageUrl = getImageUrl(req.file);
        console.log(imageUrl)
        data.imageUrl = imageUrl;
    }
    const updatedUser = await authService.updateUser(id, data);

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "User updated successfully"));
});
export const updatePassword = asyncHandler(async (req, res) => {
    const { password } = req.body;
    const { _id: id } = req.user;

    if (!id) {
        throw new ApiError(400, "User ID not provided");
    }

    if (!password) {
        throw new ApiError(400, "New password is not provided");
    }

    const success = await authService.updatePassword(id, password);

    return res
        .status(200)
        .json(new ApiResponse(200, success, "User updated successfully"));
});

export const getAllUsers = asyncHandler(async (req, res) => {
    const result = await authService.getAllUsers();
    if (result && result.length > 0) {
        return res.status(200).json(new ApiResponse(200, result, "All users fetched successfully"));
    }
    return res.status(201).json(new ApiResponse(201, "No Users found"));
})

export const getMyProfile = asyncHandler(async (req, res) => {
    const { _id: id } = req?.user;
    if (!id) {
        throw new ApiError(401, "Unauthorized")
    }
    const user = authService.getUserById(id);
    if (user) {
        return res.status(200).json(new ApiResponse(200, user, "Profile fetched successfully!"));

    }
    return res.status(201).json(new ApiResponse(201, "User not found"));
})

export const suspendAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(201, "No user Id provided")
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(201, "Invalid user id")
    }
    const result = await authService.updateUser(id, { isActive: false });
    if (result) {
        return res.status(200).json(new ApiResponse(200, result, "User suspended successfully!"));
    }
    return res.status(400).json(new ApiResponse(400, "Could not suspend user!"));
})


export const activateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(201, "No user Id provided")
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(201, "Invalid user id")
    }
    const result = await authService.updateUser(id, { isActive: true });
    if (result) {
        return res.status(200).json(new ApiResponse(200, result, "User activated successfully!"));
    }
    return res.status(400).json(new ApiResponse(400, "Could not activate user!"));
})
export const suspendMultipleAccounts = asyncHandler(async (req, res) => {
    const { userIds } = req.body

    if (!userIds || !Array.isArray(userIds) || userIds.length <= 0) {
        throw new ApiError(201, "No user Id provided")
    }
    const suspendedUsers = [];
    userIds.forEach(async (id) => {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ApiError(201, "Invalid user id")
        }
        const result = await authService.updateUser(id, { isActive: false });
        if (result) {
            suspendedUsers.push(result)
        }
    })
    if (suspendedUsers.length > 0) {
        return res.status(400).json(new ApiResponse(201, suspendedUsers, "Users suspended successfully!"));

    }
    return res.status(400).json(new ApiResponse(400, "Could not suspend users!"));
})


export const getOtherProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(201, "No user Id provided")
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(201, "Invalid user id")
    }
    const user = authService.getUserById(id);
    if (user) {
        return res.status(200).json(new ApiResponse(200, user, "Profile fetched successfully!"));

    }
    return res.status(201).json(new ApiResponse(201, "User not found"));
})

export const deleteUser = asyncHandler(async (req, res) => {

    const { id } = req.params;
    if (!id) {
        throw new ApiError(204, "User id not provided");
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid user id format");
    }
    const result = await authService.deleteUser(id);
    if (!result) {
        return res.status(202).json(new ApiResponse(202, "User not found!"));

    }
    return res.status(201).json(new ApiResponse(201, result, "User deleted successfully!"));

})

export const deleteAccount = asyncHandler(async (req, res) => {
    try {
        const { _id: id } = req.user;
        if (!id) {
            throw new ApiError(204, "User id not provided");
        }
        const result = await authService.deleteUser(id);
        if (!result) {
            return res.status(202).json(new ApiResponse(202, "User not found!"));

        }
        return res.status(201).json(new ApiResponse(201, result, "User deleted successfully!"));
    } catch (err) {
        throw new ApiError(500, "Internal Server Error");
    }
})



