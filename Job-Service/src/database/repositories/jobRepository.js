import Job from '../models/job.model.js';

class JobRepository {

    async createJob(data) {
        return await Job.create(data)
    }

}

export default new JobRepository();
