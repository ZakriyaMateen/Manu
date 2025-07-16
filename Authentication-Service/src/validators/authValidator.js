import Joi from "joi";

export const registerValidator = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
    name: Joi.string().required(),
    role: Joi.string().required(),
});
export const loginValidator = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),


});