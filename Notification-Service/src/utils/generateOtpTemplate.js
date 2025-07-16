export const generateOtpTemplate = (email, otp) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f2f4f8; padding: 40px;">
      <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05); padding: 30px;">
        
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2b2d42; font-size: 28px; margin: 0;">Interview<span style="color: #0077ff;">.ai</span></h1>
          <p style="color: #6c757d; font-size: 14px; margin-top: 5px;">Empowering smart hiring decisions</p>
        </div>

        <h2 style="color: #2b2d42; font-size: 22px;">Verify Your Email Address</h2>

        <p style="color: #4a4a4a; font-size: 16px;">
          Hi <strong>${email}</strong>,
        </p>
        <p style="color: #4a4a4a; font-size: 16px;">
          Thank you for signing up! Please use the OTP below to verify your email address:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; font-size: 28px; font-weight: bold; color: #ffffff; background-color: #0077ff; padding: 12px 30px; border-radius: 8px; letter-spacing: 3px;">
            ${otp}
          </div>
        </div>

        <p style="color: #4a4a4a; font-size: 15px;">
          This OTP is valid for the next <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
        <p style="color: #a0a0a0; font-size: 14px;">
          If you did not request this, you can safely ignore this email.
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;" />

        <p style="color: #4a4a4a; font-size: 15px;">Best regards,</p>
        <p style="font-weight: bold; color: #0077ff; font-size: 16px;">The Interview.ai Team</p>
      </div>
    </div>
  `;
};
