import NotificationService from '../services/notificationService.js';
import { ApiError } from '../utils/ApiError.js';
import { generateOtpTemplate } from "../utils/generateOtpTemplate.js"
export const sendOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!otp) {
            return res.status(400).json({ message: "No otp provided" })
        }
        const success = await NotificationService.sendEmail(email, generateOtpTemplate(email, otp))
        if (success) {
            return res.status(200).json({ message: "Otp Sent to email" })
        } else {
            return res.status(400).json({ message: "Could not send otp" })
        }

    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ message: "Internal server error" })

    }
}


