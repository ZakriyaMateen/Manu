import Joi from "joi";

export const jobValidator = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    qualifications: Joi.string().required(),
    salary: Joi.number().required(),             // 💡 salary is a Number in schema
    tags: Joi.array().items(Joi.string()),       // 💡 tags is an array of strings
    userId: Joi.string().hex().length(24).required(),  // 💡 Mongo ObjectId
    companyId: Joi.string().hex().length(24).required() // 💡 Mongo ObjectId
});