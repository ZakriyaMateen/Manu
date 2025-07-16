import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { handleProxyError } from '../../middleware/errorHandler.js';


export default createProxyMiddleware({
    target: 'http://localhost:4002',
    changeOrigin: true,
    pathRewrite: { '^/api/v1/auth': '/auth' }, // proxy to /auth/ in auth service
    onProxyReq: fixRequestBody,
    onError(err, _req, res) {
        console.error('✖ auth proxy error:', err);
        res.status(502).json({ error: 'Auth service not responding.' });
    },
})


