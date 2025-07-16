
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import jwt from 'jsonwebtoken'

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const options = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
    };
    try {
        const token = req.headers.authorization?.replace("Bearer ", "")

        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)
            .populate('createdBy', 'domainName')
            .select("-password -refreshToken -otp")

        if (!user) {
            res
                .cookie("accessToken", '', { ...options, expires: new Date(0) })
                .cookie("refreshToken", '', { ...options, expires: new Date(0) });
            throw new ApiError(401, "Invalid Access Token")
        }

        if (!user.isActive) {
            res
                .cookie("accessToken", '', { ...options, expires: new Date(0) })
                .cookie("refreshToken", '', { ...options, expires: new Date(0) });
            throw new ApiError(403, "Your account has been deactivated. Please contact the administrator.");
        }

        req.user = user;
        next()

    } catch (error) {
        res
            .cookie("accessToken", '', { ...options, expires: new Date(0) })
            .cookie("refreshToken", '', { ...options, expires: new Date(0) });
        throw new ApiError(401, error?.message || "Invalid Access token")
    }
})



/**
 * Middleware to check if user has required role(s)
 * @param {string[]} allowedRoles - Array of roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
export const authorize = (allowedRoles) => {
    return asyncHandler(async (req, res, next) => {
        const isProduction = process.env.NODE_ENV === 'production';
        const options = {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            path: '/',
        };

        // User should be attached to req by verifyJWT middleware
        if (!req.user) {
            res
                .cookie("accessToken", '', { ...options, expires: new Date(0) })
                .cookie("refreshToken", '', { ...options, expires: new Date(0) });
            throw new ApiError(401, "Unauthorized request");
        }

        // Check if user has one of the allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            res
                .cookie("accessToken", '', { ...options, expires: new Date(0) })
                .cookie("refreshToken", '', { ...options, expires: new Date(0) });

            throw new ApiError(403, "You don't have permission to access this resource");
        }

        // If authorized, proceed to the next middleware or route handler
        next();
    });
};