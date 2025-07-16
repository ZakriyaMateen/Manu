import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

class NotificationService {
  constructor() {
    dotenv.config();

    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Automatically handles host/port/secure
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendEmail(toEmail, htmlTemplate) {
    try {


      console.log("Sending Email");

      const info = await this.transporter.sendMail({
        from: `"No Reply" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Your OTP Code',
        html: htmlTemplate,
      });

      console.log('Email sent: %s', info.messageId);
      return true;
    } catch (error) {
      console.error('Email send error:', error.message);
      return false;
    }
  }
}

export default new NotificationService();
