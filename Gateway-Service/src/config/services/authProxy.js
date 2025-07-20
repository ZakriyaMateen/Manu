

// gateway/src/routes/authGateway.js
import express from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';


// Auth‐service middleware (make sure to point these imports at your auth‐service source)
import {
    authorize,
    isUserActive,
    verifyJWT
} from '../../middleware/authMiddleware.js';


// const TARGET = 'http://localhost:4002';
const TARGET = 'http://auth-service:4002';
const CONTEXT = '/api/v1/auth';
function forwardUserHeader(req, _res, next) {
    if (req.user) {
        // encode into header so proxy will send it along
        req.headers['x-user'] = encodeURIComponent(JSON.stringify(req.user));
    }
    next();
}
// create a single proxy instance
const authProxy = createProxyMiddleware({
    target: TARGET,
    changeOrigin: true,
    pathRewrite: { [`^${CONTEXT}`]: '/auth' },
    onProxyReq: fixRequestBody,
    onError(err, _req, res) {
        console.error('✖ auth proxy error:', err);
        res.status(502).json({ error: 'Auth service not responding.' });
    },
});

const router = express.Router();

// public routes
router.post('/register', authProxy);
router.post('/login', authProxy);
router.get('/refresh', authProxy);
router.post('/logout', authProxy);
router.post('/verify-otp', authProxy);
router.post('/google-auth', authProxy);
router.post('/forgot-password', authProxy);
router.post('/verify-otp-forgot-password', authProxy);



router.get(
    '/is-user-active',
    verifyJWT,
    forwardUserHeader,  // serializes it into headers
    authProxy
);
// protected routes
router.patch(
    '/update-user',
    verifyJWT,
    isUserActive,
    forwardUserHeader,  // serializes it into headers
    authProxy
);

router.put(
    '/update-password',
    verifyJWT,
    isUserActive,
    forwardUserHeader,  // serializes it into headers

    authProxy
);

router.get(
    '/get-my-profile',
    verifyJWT,
    isUserActive,
    forwardUserHeader,  // serializes it into headers
    authProxy
);

router.get(
    '/get-some-profile/:id',
    verifyJWT,
    authorize(['admin']),
    forwardUserHeader,  // serializes it into headers

    authProxy
);

router.get(
    '/get-all-users',
    verifyJWT,
    authorize(['admin']),
    forwardUserHeader,  // serializes it into headers

    authProxy
);

router.delete(
    '/delete-account',
    verifyJWT,
    forwardUserHeader,  // serializes it into headers
    isUserActive,
    authProxy
);

router.delete(
    '/delete-user/:id',
    verifyJWT,
    authorize(['admin']),
    forwardUserHeader,  // serializes it into headers
    authProxy
);

router.put(
    '/suspend-user/:id',
    verifyJWT,
    authorize(['admin']),
    forwardUserHeader,  // serializes it into headers
    authProxy
);

router.put(
    '/activate-user/:id',
    verifyJWT,
    authorize(['admin']),
    forwardUserHeader,  // serializes it into headers

    authProxy
);

router.put(
    '/suspend-multiple-users',
    verifyJWT,
    authorize(['admin']),
    forwardUserHeader,  // serializes it into headers
    authProxy
);


export default router;
