// ───────────── auth-service/app.js ─────────────
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import bodyParser from 'body-parser';
import authRoutes from './routes/authRoutes.js';

import authService from './services/authService.js';
import { setupSwagger } from './utils/swagger.js';

const app = express();
const PORT = process.env.PORT || 4002;

// Build allowedOrigins from CORS_ORIGIN env var
const rawOrigins = (process.env.CORS_ORIGIN || '').split(',');
const allowedOrigins = rawOrigins.map(o => {
    o = o.trim();
    if (o.includes('*')) {
        const [protocol, rest] = o.split('://');
        const escaped = rest.replace(/\./g, '\\.').replace('*', '[a-zA-Z0-9-]+');
        return new RegExp(`^${protocol}://${escaped}$`);
    }
    return o;
});

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const ok = allowedOrigins.some(a =>
            a instanceof RegExp ? a.test(origin) : a === origin
        );
        callback(ok ? null : new Error(`Not allowed by CORS: ${origin}`), ok);
    },
    credentials: true,
};

// 1) Middleware
app.use(cookieParser());
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(bodyParser.json()); // to parse application/json
app.use(bodyParser.urlencoded({ extended: true })); // to parse form data
// 2) Static files
// app.use('/public', express.static('public'));

// 3) Auth routes under /auth
// app.use('/auth', authRoutes);
app.use('/', authRoutes);
setupSwagger(app);


// 4) Health‐check
// app.use('/', (_req, res) => res.send('Auth Service is up and running'));

app.listen(PORT, () => console.log(`Auth Service listening on ${PORT}`));

// // RPC server startup
// startRpcServer('rpc_requests', {
//     rpc_get_user: async ({ userId }) => {
//         if (!userId) throw new Error('Missing userId');
//         return authService.getUserById(userId);
//     },
//     rpc_all_users: async () => authService.getAllUsers(),
// }).catch(err => {
//     console.error('❌ Failed to start RPC server:', err);
//     process.exit(1);
// });

export default app;
