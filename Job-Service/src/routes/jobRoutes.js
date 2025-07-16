import express from 'express';
import {
    postJobs,
    updateJob,
    deleteJob,
    getAllJobs
} from '../controllers/jobController.js';

const router = express.Router();

router.get('/getAllJobs', getAllJobs);
router.delete('/deleteJob/:id', deleteJob);
router.put('/updateJob/:id', updateJob);
router.post('/postJobs', postJobs);

export default router;
