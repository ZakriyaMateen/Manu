import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import connectDB from './src/config/db.js';
import { initPublisher } from './src/events/publisher.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB

connectDB()
    .then(async () => {
        await initPublisher();
        console.log("initialized")

        app.listen(PORT, () => {
            console.log(`✅ Auth Service running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Failed to connect to database', err);
        process.exit(1);
    });
