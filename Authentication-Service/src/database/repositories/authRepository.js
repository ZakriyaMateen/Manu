import User from '../models/user.model.js';
import bcrypt from 'bcrypt';

class UserRepository {
    async createUser(data) {
        const user = new User(data);
        return await user.save();
    }
    async findByEmail(email) {
        return await User.findOne({ email });
    }
    async findById(id) {
        console.log("ID : ", id);
        return await User.findById(id);
    }
    async updateRefreshToken(userId, token) {
        return await User.findByIdAndUpdate(userId, { refreshToken: token }, { new: true });
    }
    async removeRefreshToken(userId) {

        const result = await User.findByIdAndUpdate(userId, { refreshToken: null }, { new: false });
        console.log(result)
        return result
    }
    async getAllUsers() {
        return await User.find().lean();
    }

    async updatePassword(userId, newPassword) {
        if (newPassword) {
            const salt = await bcrypt.genSalt(10);
            newPassword = await bcrypt.hash(newPassword, salt);
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { password: newPassword },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedUser) return null;

        return "Password changed successfully!";

    }

    async updateUser(userId, user) {
        // Build updateData dynamically (exclude email, password, and null/undefined fields)
        const allowedFields = ['name', 'role', 'refreshToken', 'otp', 'otpExpiry', 'isVerified', 'imageUrl', 'isActive'];
        const updateData = {};

        for (const key of allowedFields) {
            if (user[key] !== null && user[key] !== undefined) {
                updateData[key] = user[key];
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedUser) return null;

        return updatedUser;
    }

    async deleteUser(userId) {

        const deletedUser = await User.findByIdAndDelete(userId)
        console.log(deletedUser)

        if (!deletedUser) {
            return null
        }
        return deletedUser
    }

}

export default new UserRepository();
