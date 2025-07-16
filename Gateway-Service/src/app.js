// import express from 'express';
// import proxyRoutes from './routes/proxyRoutes.js';

// const app = express();
// app.use(express.json());

// // Load all proxy routes
// app.use('/api/v1', proxyRoutes);

// // Health & fallback
// app.get('/ping', (_req, res) => res.send('pong'));
// app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

// export default app;


import express from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { verifyJWT } from './middleware/authMiddleware.js';
import proxyRoutes from "../src/routes/proxyRoutes.js"

const app = express();

// Auth service
app.use(
    '/api/v1',
    proxyRoutes
);



app.use(express.json());

// Health & fallback
app.get('/ping', (_req, res) => res.send('pong'));
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

app.listen(process.env.PORT || 4010);
export default app;
