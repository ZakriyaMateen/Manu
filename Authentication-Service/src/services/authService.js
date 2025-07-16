import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import userRepo from "../database/repositories/authRepository.js";
import { ApiError } from '../utils/ApiError.js';
import { generateRandomOTP } from '../utils/otpGenerator.js';
import { publishEventWithResponse } from '../events/publisher.js';
import ApiClient from '../utils/ApiClient.js';
import authRepository from '../database/repositories/authRepository.js';

class AuthService {
  generateTokens(user) {
    const payload = { _id: user._id, email: user.email, name: user.name, role: user.role };

    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15h' });

    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  }
  static notificationService = new ApiClient('http://localhost:4003');
  async googleAuth(email, name, id_token) {
    try {
      const existingUser = await userRepo.findByEmail(email);
      if (existingUser) {
        console.log("existing user")

        if (existingUser.isVerified) {
        } else {

          await userRepo.updateUser(existingUser._id, { isVerified: true })
        }
        const tokens = this.generateTokens(existingUser);
        const updated = await userRepo.updateUser(existingUser._id, { refreshToken: tokens.refreshToken });
        console.log(updated)
        return { user: existingUser, ...tokens }
      } else {
        const newUser = await userRepo.createUser(
          {
            name: name,
            email: email,
            role: "candidate",
            isVerified: true,
            password: id_token
          }
        )
        const tokens = this.generateTokens(newUser);
        const u = await userRepo.updateUser(newUser._id, { refreshToken: tokens.refreshToken });

        return { user: newUser, ...tokens }
      }
    } catch (err) {
      return err.message;
    }
  }
  async register(email, password, role, name) {

    const existingUser = await userRepo.findByEmail(email);


    const otp = generateRandomOTP();

    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 mins

    if (existingUser) {
      if (existingUser.isVerified) {
        throw new Error('User already exists');
      } else {
        existingUser.password = password;
        existingUser.otp = otp;
        existingUser.otpExpiry = otpExpiry;
        await existingUser.save();
      }
    } else {
      await userRepo.createUser({
        email,
        password: password,
        role,
        name,
        otp,
        otpExpiry,
        isVerified: false,
      });
    }


    // const response = await
    publishEventWithResponse("notification_queue", {
      type: "send_otp",
      email,
      otp,
    });

    // if (!response.success) {
    //   throw new Error("Failed to send OTP: " + response.error);
    // }
    return true;
    // const res = await AuthService.notificationService.post('/notification/sendOtp', { email, otp });
    // if (res.status === 200) {
    //   return true;
    // }
    // return false;


  }
  async verifyOTP(email, otp) {
    console.log(email);
    const user = await userRepo.findByEmail(email);
    console.log("USER ", user)
    if (!user) throw new Error('User not found');
    if (user.isVerified) throw new Error('User already verified');
    if (String(user.otp).trim() !== String(otp).trim()) {

      throw new Error('Invalid OTP');
    }
    if (user.otpExpiry < Date.now()) {
      throw new Error('Expired OTP');
    }
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    const tokens = this.generateTokens(user);

    user.refreshToken = tokens.refreshToken;
    const verifiedUser = await user.save();

    await userRepo.updateRefreshToken(user._id, user.refreshToken);

    return { user: verifiedUser, ...tokens }
  }
  async login(email, password) {
    const user = await userRepo.findByEmail(email);
    if (!user) throw new Error('User not found');
    if (!user?.isVerified) {
      throw new Error("User not verified");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Invalid credentials')
    const tokens = this.generateTokens(user);
    await userRepo.updateRefreshToken(user._id, tokens.refreshToken);
    return { user, ...tokens };
  }
  async getAllUsers() {
    return await userRepo.getAllUsers();
  }
  async refresh(refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      const user = await userRepo.findById(payload._id);

      if (!user || user.refreshToken !== refreshToken) throw new Error('Invalid refresh token');

      const tokens = this.generateTokens(user);
      await userRepo.updateRefreshToken(user._id, tokens.refreshToken);
      return tokens;
    } catch (err) {
      throw new Error('Invalid refresh token');
    }
  }
  async getUserById(userId) {
    try {
      if (!userId) {
        throw new ApiError(401, "user id not provided");
      }
      return await userRepo.findById(userId);
    } catch (e) {
      return e.message;
    }
  }
  async logout(userId) {
    return await userRepo.removeRefreshToken(userId);
  }
  async updateUser(userId, data) {
    const updatedUser = await authRepository.updateUser(userId, data);

    if (!updatedUser) {
      throw new ApiError(404, "User not found");
    }

    return updatedUser;
  }
  async updatePassword(userId, newPassword) {
    const updatedUser = await authRepository.updatePassword(userId, newPassword);

    if (!updatedUser) {
      throw new ApiError(404, "User not found");
    }

    return updatedUser;
  }
  async deleteUser(userId) {
    return await userRepo.deleteUser(userId);

  }
}

export default new AuthService();
