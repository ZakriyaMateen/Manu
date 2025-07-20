import authService from '../services/authService.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { registerValidator } from '../validators/authValidator.js';
import redis, { isBlacklisted } from '../middleware/redisClient.js';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/AsyncHandler.js';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import { parseFormData } from '../utils/parseFormData.js';
import { getImageUrl } from '../utils/getImageUrl.js';
import mongoose from 'mongoose';

dotenv.config();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to set cookies
function setAuthCookies(res, accessToken, refreshToken) {
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
    });
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
    });
}
export const googleLogin = asyncHandler(async (req, res) => {
    const { id_token } = req.body;
    if (!id_token) throw new ApiError(400, 'ID token is required');

    const ticket = await googleClient.verifyIdToken({ idToken: id_token });
    const payload = ticket.getPayload() || {};
    const { email, name } = payload;
    if (!email || !name) throw new ApiError(400, 'Invalid Google token payload');

    const result = await authService.googleAuth(email, name, id_token);
    return res.status(200).json(new ApiResponse(200, result, 'Google login successful'));
});
export const register = asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body;

    // Validate request body
    const { error } = registerValidator.validate({ email, password, name, role });
    if (error) {
        const messages = error.details.map(d => d.message);
        throw new ApiError(422, 'Validation failed', messages);
    }
    if (password.length < 6) {
        throw new ApiError(422, 'Password too weak', ['Password must be at least 6 characters long']);
    }

    await authService.register(email, password, role, name);
    return res.status(201).json(new ApiResponse(201, null, `OTP sent to ${email}`));
});
export const verifyOtp = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) throw new ApiError(400, 'Email and OTP are required');

    const result = await authService.verifyOTP(email, otp);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return res.status(200).json(new ApiResponse(200, result, 'OTP verified successfully'));
});
export const verifyOtpForgotPassword = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) throw new ApiError(400, 'Email and OTP are required');

    const result = await authService.verifyOtpForgotPassword(email, otp);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return res.status(200).json(new ApiResponse(200, result, 'OTP verified successfully'));
});
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
    }

    // authenticate + load user
    const result = await authService.login(email, password);
    const user = result?.user;
    if (!user) {
        // no such user or bad creds
        throw new ApiError(401, 'Invalid email or password');
    }

    // EXPLICITLY deny inactive users
    if (!user.isActive) {
        // you can choose to return or throw here; throwing will hit your global error handler
        throw new ApiError(403, 'Your account is inactive or suspended');
    }

    // only active users reach here
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return res
        .status(200)
        .json(new ApiResponse(200, {
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            accessToken: result.accessToken,
            refreshToken: result.refreshToken
        }, 'Login successful'));
});
export const refreshToken = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) throw new ApiError(401, 'Refresh token missing');
    if (await isBlacklisted(token)) throw new ApiError(401, 'Refresh token invalid');

    const tokens = await authService.refresh(token);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return res.status(200).json(new ApiResponse(200, tokens, 'Token refreshed successfully'));
});
export const logout = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken;
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    if (!req.user?._id) throw new ApiError(401, 'User not authenticated');
    const oldUser = await authService.logout(req.user._id);
    if (!oldUser) throw new ApiError(404, 'User not found');

    const { refreshToken } = oldUser;
    if (!refreshToken) throw new ApiError(400, 'User already logged out');

    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const expiresIn = payload.exp - Math.floor(Date.now() / 1000);
    await redis.set(`bl:${refreshToken}`, 'true', 'EX', expiresIn);

    return res.status(200).json(new ApiResponse(200, null, 'Logout successful'));
});
export const getAllUsers = asyncHandler(async (req, res) => {
    const users = await authService.getAllUsers();
    if (!users.length) throw new ApiError(404, 'No users found');
    return res.status(200).json(new ApiResponse(200, users, 'Users fetched successfully'));
});
export const getMyProfile = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const user = await authService.getUserById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    return res.status(200).json(new ApiResponse(200, user, 'Profile fetched successfully'));
});
export const updateUser = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const data = parseFormData(req);
    if (!Object.keys(data).length && !req.file) throw new ApiError(400, 'No data provided');

    if (req.file) data.imageUrl = getImageUrl(req.file);
    const updated = await authService.updateUser(userId, data);
    return res.status(200).json(new ApiResponse(200, updated, 'User updated successfully'));
});
export const updatePassword = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const { password } = req.body;
    if (!userId || !password) throw new ApiError(400, 'User ID and new password are required');

    const result = await authService.updatePassword(userId, password);
    return res.status(200).json(new ApiResponse(200, result, 'Password updated successfully'));
});
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req?.body;
    if (email) {
        const result = await authService.forgotPassword(email);
        if (result) {
            return res.status(201).json(new ApiResponse(201, result, 'OTP sent to email!'));
        }
        return res.status(400).json(new ApiResponse(400, result, 'Could not send email!'));
    }
    return res.status(400).json(new ApiResponse(400, 'email not provided', 'Please provide an email!'));

})
export const suspendAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid user ID');

    const result = await authService.updateUser(id, { isActive: false });
    return res.status(200).json(new ApiResponse(200, result, 'User suspended successfully'));
});
export const activateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid user ID');

    const result = await authService.updateUser(id, { isActive: true });
    return res.status(200).json(new ApiResponse(200, result, 'User activated successfully'));
});
export const suspendMultipleAccounts = asyncHandler(async (req, res) => {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || !userIds.length) throw new ApiError(400, 'User IDs are required');

    const suspended = [];
    for (const id of userIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) continue;
        const user = await authService.updateUser(id, { isActive: false });
        if (user) suspended.push(user);
    }
    if (!suspended.length) throw new ApiError(404, 'No users suspended');

    return res.status(200).json(new ApiResponse(200, suspended, 'Users suspended successfully'));
});
export const getOtherProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid user ID');

    const user = await authService.getUserById(id);

    if (!user) throw new ApiError(400, 'User not found');
    return res.status(200).json(new ApiResponse(200, user, 'Profile fetched successfully'));
});
export const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid user ID');

    const deleted = await authService.deleteUser(id);
    if (!deleted) throw new ApiError(404, 'User not found');
    return res.status(200).json(new ApiResponse(200, deleted, 'User deleted successfully'));
});
export const deleteAccount = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const deleted = await authService.deleteUser(userId);
    if (!deleted) throw new ApiError(404, 'User not found');
    return res.status(200).json(new ApiResponse(200, deleted, 'Account deleted successfully'));
});

export const isUserActive = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!userId) throw new ApiError(400, "userId is required");

    const isActive = await authService.isUserActive(userId);
    res.status(200).json(
        new ApiResponse(200, isActive, "User status fetched successfully")
    );
});
