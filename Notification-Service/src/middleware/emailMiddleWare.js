import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validateEmail } from "../validators/emailValidator.js";


export const emailMiddleWare = (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "No email provided" })
        }
        if (!validateEmail(email)) {

            return res.status(400).json({ message: "Invalid email provided" })

        }
        console.log("Email: ", email)
        next();
    } catch (error) {
        console.log(error);
        return res.status(400).json({ message: "internal server error" })
    }
}
