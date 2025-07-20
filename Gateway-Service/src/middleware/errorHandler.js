// gateway/src/middleware/errorHandler.js
import { ApiError } from '../utils/ApiError.js';

export function handleProxyError(err, res, serviceName) {
    console.error(`✖ Proxy error for ${serviceName}:`, err);
    res.status(502).json({ error: `${serviceName} not responding` });
}

export function errorHandler(err, _req, res, _next) {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            errors: err.errors || [],
            data: null,
        });
    }
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
}
