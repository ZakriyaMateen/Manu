import express from 'express';
import jobsRoutes from './routes/jobRoutes.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { ApiError } from './utils/ApiError.js';

const app = express();
app.use(express.json()); // ✅ ✅ ✅ ADD THIS at the top



const PORT = process.env.PORT || 4003;

// Build allowedOrigins
const rawOrigins = process.env.CORS_ORIGIN?.split(',') || [];
const allowedOrigins = rawOrigins.map(origin => {
    origin = origin.trim();
    if (origin.includes('*')) {
        const [protocol, rest] = origin.split('://');
        const escaped = rest.replace(/\./g, '\\.').replace('*', '[a-zA-Z0-9-]+');
        return new RegExp(`^${protocol}://${escaped}$`);
    }
    return origin;
});

// CORS setup
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.some(allowed =>
            allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
        );
        if (isAllowed) return callback(null, true);
        callback(new Error('Not allowed by CORS: ' + origin));
    },
    credentials: true
};

app.use(express.json());

app.use((req, res, next) => {
    const userHeader = req.headers['x-user'];
    if (userHeader) {
        try {
            req.user = JSON.parse(userHeader);
            console.log("✅ Received user in Job Service:", req.user);
        } catch (err) {
            console.error("❌ Invalid x-user header", err);
        }
    }
    if (!req.user) {
        throw new ApiError(403, "Unauthorized")
    }
    next();
});

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(compression());

app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static('public'));



app.use('/', jobsRoutes); // ✅ mount at root

app.listen(4003, () => {
    console.log('Job service running on port 4003');
});


export default app;
