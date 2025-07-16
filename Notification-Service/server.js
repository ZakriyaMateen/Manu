import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import connectDB from './src/config/db.js';
import { startConsumer } from './src/events/subscriber.js';

const PORT = process.env.PORT || 4003;

await startConsumer();
console.log("YESS")

// Connect to MongoDB
// connectDB()
//     .then(() => {
//         app.listen(PORT, () => {
//             console.log(`✅ Notification Service running on http://localhost:${PORT}`);
//         });
//     })
//     .catch((err) => {
//         console.error('❌ Failed to connect to database', err);
//         process.exit(1);
//     });
