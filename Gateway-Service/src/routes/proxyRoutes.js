import express from 'express';
import authProxy from '../config/services/authProxy.js';

// Add more services like userProxy, orderProxy etc as you scale

const router = express.Router();

router.use('/auth', authProxy);

export default router;
