import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';


const router = express.Router();

// ✅ Use '/' instead of '*' to proxy everything under /api/v1/auth
router.use('/', createProxyMiddleware(proxyOptions));

export default router;
