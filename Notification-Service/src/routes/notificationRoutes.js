import express from 'express';

import { sendOtp } from '../controllers/notificationController.js';
import { emailMiddleWare } from '../middleware/emailMiddleWare.js';

const router = express.Router();

router.post('/sendOtp', emailMiddleWare, sendOtp);




export default router;
