import jwt from 'jsonwebtoken';
import axios from 'axios'
import { ApiError } from "../utils/ApiError.js";


import { asyncHandler } from '../utils/AsyncHandler.js';
export default function (req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.sendStatus(401);

    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        res.sendStatus(403);
    }
}


export const isUserActive = asyncHandler(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized request");

    try {
        const authHost = process.env.AUTH_SERVICE_HOST || "http://localhost:4002";
        const url = `${authHost}/is-user-active`;  // note the /auth prefix

        const response = await axios.post(
            url,
            { userId },
            { headers: { "Content-Type": "application/json" } }
        );

        // 200 OK → payload.data is the boolean
        if (response.data.data === true) {
            return next();
        } else {
            throw new ApiError(403, "User account is suspended or inactive");
        }
    } catch (err) {
        console.error("isUserActive error:", err.message);

        // If auth‐service actually responded with an error status…
        if (err.isAxiosError && err.response) {
            const { status, data } = err.response;
            // forward exact status & message
            throw new ApiError(status, data.message || data.error || "Auth service error");
        }
        // otherwise it really was a network/timeout/etc
        if (err.isAxiosError) {
            throw new ApiError(502, "Auth service not responding");
        }
        // any ApiError you yourself threw above will just bubble
        throw err;
    }
});

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



        const user = {
            _id: decodedToken?._id,
            role: decodedToken?.role,
            name: decodedToken?.name,
            email: decodedToken?.email
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