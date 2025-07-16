import jwt from 'jsonwebtoken';

import jobRepo from "../database/repositories/jobRepository.js";
import { ApiError } from '../utils/ApiError.js';

class JobService {
  async postJob(userId, name, description, qualifications, salary, tags, companyId) {

    const data = {
      userId,
      name,
      description,
      qualifications,
      salary,
      tags,
      companyId
    }
    const response = await jobRepo.createJob(data);
    return response;

  }
}

export default new JobService();
