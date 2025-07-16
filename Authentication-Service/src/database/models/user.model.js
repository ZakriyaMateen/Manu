import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "staff", "candidate", "super_admin"], required: true, },
    name: { type: String, required: true, },
    refreshToken: { type: String, default: null },
    otp: { type: Number, default: null },
    otpExpiry: { type: Date, default: null },
    imageUrl: { type: String, default: null },
    isVerified: { type: Boolean, default: false, required: true }
});


// Hash password before save
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

export default mongoose.model('User', userSchema);
