export const generateRandomOTP = (n = 6) => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < n; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}