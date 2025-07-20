// ─────────── auth-service/routes/authRoutes.js ───────────
import express from 'express';
import { activateUser, deleteAccount, deleteUser, forgotPassword, getAllUsers, getMyProfile, getOtherProfile, googleLogin, isUserActive, login, logout, refreshToken, register, suspendAccount, suspendMultipleAccounts, updatePassword, updateUser, verifyOtp, verifyOtpForgotPassword } from '../controllers/authController.js';
import { upload, uploadErrorHandler } from '../middleware/multerMiddleware.js';
import { authorize, unpackForwardedUser, verifyJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// router.post('/register', register);
// router.post('/login', login);
// router.get('/refresh', refreshToken);
// router.post('/logout', logout);
// router.post('/verify-otp', verifyOtp)
// router.post('/google-auth', googleLogin)
// router.patch('/update-user', verifyJWT, upload.single('display_image'), uploadErrorHandler, updateUser)
// router.put('/update-password', verifyJWT, updatePassword)
// router.get('/get-my-profile', verifyJWT, getMyProfile)
// router.get('/get-some-profile/:id', verifyJWT, authorize(['admin']), getOtherProfile)
// router.get('/get-all-users', verifyJWT, authorize(['admin']), getAllUsers)
// router.delete('/delete-account', verifyJWT, deleteAccount)
// router.delete('/delete-user/:id', verifyJWT, authorize(['admin']), deleteUser)
// router.put('/suspend-user/:id', verifyJWT, authorize(['admin']), suspendAccount)
// router.put('/activate-user/:id', verifyJWT, authorize(['admin']), activateUser)
// router.put('/suspend-multiple-users', verifyJWT, authorize(['admin']), suspendMultipleAccounts)





router.post('/register', register);
router.post('/login', login);
router.get('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/google-auth', googleLogin)

router.post('/verify-otp', verifyOtp)
router.post('/verify-otp-forgot-password', verifyOtpForgotPassword)
router.patch('/update-user', unpackForwardedUser, upload.single('display_image'), uploadErrorHandler, updateUser)
router.put('/update-password', unpackForwardedUser, updatePassword)
router.post('/forgot-password', forgotPassword)

router.get('/get-my-profile', unpackForwardedUser, getMyProfile)
router.get('/get-some-profile/:id', unpackForwardedUser, getOtherProfile)
router.get('/get-all-users', unpackForwardedUser, getAllUsers)
router.delete('/delete-account', unpackForwardedUser, deleteAccount)
router.delete('/delete-user/:id', unpackForwardedUser, deleteUser)

router.put('/suspend-user/:id', unpackForwardedUser, suspendAccount)
router.put('/activate-user/:id', unpackForwardedUser, activateUser)
router.put('/suspend-multiple-users', unpackForwardedUser, suspendMultipleAccounts)

router.post("/is-user-active", unpackForwardedUser, isUserActive)



export default router;
