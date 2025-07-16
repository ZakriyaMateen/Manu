import JobService from '../services/jobService.js';
import { ApiError } from '../utils/ApiError.js';
import { jobValidator } from "../validators/jobValidator.js"

import { fetchAllUsers, fetchUser } from '../events/userRpcClient.js';

export const postJobs = async (req, res) => {
    const user = req?.user;

    const { name, description, qualifications, salary, tags, companyId } = req.body;
    // 1) Validate payload as before…
    // 2) Fetch the full user profile:
    let userProfile;
    try {
        userProfile = await fetchAllUsers(user?._id);

        console.log('✅ Got user from Auth Service:', userProfile);
    } catch (err) {
        throw new ApiError(502, 'Failed to fetch user: ' + err.message);
    }

    // 3) Now you have userProfile – you can enrich the job or validate company ownership, etc.
    const response = await JobService.postJob(
        user?._id,
        user?.name, description, qualifications, salary, tags, companyId,

    );

    return res.status(200).json({ message: response });
};


export const getAllJobs = async (req, res) => {
    return res.status(200).json({ message: "getAllJobs called" })
}

export const deleteJob = async (req, res) => {
    return res.status(200).json({ message: "delete job called" })
}

export const updateJob = async (req, res) => {
    return res.status(200).json({ message: "update called" })
}
