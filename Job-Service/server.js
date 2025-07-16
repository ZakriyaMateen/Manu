import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import connectDB from './src/config/db.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`✅ Job service running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Failed to connect to database', err);
        process.exit(1);
    });
