import { Router } from "express";
import rateLimit from "express-rate-limit";
import { 
    login, 
    register, 
    googleAuth, 
    getUserProfile, 
    updateUserProfile, 
    updatePreferences,
    forgotPassword,
    resetPassword,
    verifyEmail,
    sendVerificationEmail,
    scheduleMeeting,
    getScheduledMeetings,
    deleteScheduledMeeting,
    submitFeedback,
    getUserHistory, 
    addToHistory, 
    deleteHistory,
    logout,
    logoutAllDevices,
    deleteAccount,
    refreshToken,
    getIceServers
} from "../controllers/user.controller.js";
import {
    validateBody,
    registerSchema,
    loginSchema,
    googleAuthSchema,
    updateProfileSchema,
    addToHistorySchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    preferencesSchema,
    scheduleMeetingSchema,
    feedbackSchema
} from "../middleware/validator.js";

const router = Router();

// Rate limiter for authentication endpoints: max 25 attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please try again after 15 minutes." }
});

// Rate limiter for general sensitive actions
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please slow down." }
});

router.route("/login").post(authLimiter, validateBody(loginSchema), login);
router.route("/register").post(authLimiter, validateBody(registerSchema), register);
router.route("/google_auth").post(authLimiter, validateBody(googleAuthSchema), googleAuth);
router.route("/refresh_token").post(authLimiter, refreshToken);
router.route("/logout").post(logout);
router.route("/logout_all").post(logoutAllDevices);
router.route("/delete_account").delete(deleteAccount).post(deleteAccount);
router.route("/ice_servers").get(getIceServers);

// Password Reset & Email Verification Flow
router.route("/forgot_password").post(authLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.route("/reset_password").post(authLimiter, validateBody(resetPasswordSchema), resetPassword);
router.route("/verify_email").post(validateBody(verifyEmailSchema), verifyEmail);
router.route("/send_verification").post(generalLimiter, sendVerificationEmail);
router.route("/send_verification_email").post(generalLimiter, sendVerificationEmail);

// User Profile & Database Preferences
router.route("/profile")
    .get(getUserProfile)
    .put(validateBody(updateProfileSchema), updateUserProfile);

router.route("/get_profile").get(getUserProfile);
router.route("/update_profile").post(validateBody(updateProfileSchema), updateUserProfile);
router.route("/preferences").put(validateBody(preferencesSchema), updatePreferences);

// Scheduled Meetings Flow
router.route("/schedule_meeting").post(generalLimiter, validateBody(scheduleMeetingSchema), scheduleMeeting);
router.route("/scheduled_meetings").get(getScheduledMeetings);
router.route("/scheduled_meeting/:id").delete(deleteScheduledMeeting);
router.route("/scheduled_meeting").delete(deleteScheduledMeeting);

// Post-Call Feedback
router.route("/feedback").post(validateBody(feedbackSchema), submitFeedback);

// Meeting History
router.route("/add_to_activity").post(generalLimiter, validateBody(addToHistorySchema), addToHistory);
router.route("/get_all_activity").get(getUserHistory);
router.route("/delete_activity").delete(deleteHistory);

export default router;