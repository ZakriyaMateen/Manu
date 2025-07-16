import express from 'express';
import notificationRoutes from './routes/notificationRoutes.js';
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import { configDotenv } from 'dotenv';

import dotenv from 'dotenv';
dotenv.config();
const app = express();

// app.use(cookieParser()); // Must come before body parsers
// app.use(cors(corsOptions)); // Cors before JSON parsing
// app.use(compression());

app.use(express.json()); // ✅ Fix: move here, after cookieParser & cors
app.use(express.urlencoded({ extended: true, limit: "500mb" }));



// 🧪 Routes
app.use('/notification', notificationRoutes);
app.get("/", (req, res) => {
    res.status(200).json({ message: 'Notification Service is up and running' });
})
// app.use('/', (req, res) => {
//     res.send('Notification Service is up and running');
// });

// 🚀 Start
app.listen(process.env.PORT || 4003, () => {
    console.log(`Server running on port ${process.env.PORT || 4003}`);
});

export default app;
