import httpStatus from "http-status";
import crypto from "crypto";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";
import { ScheduledMeeting } from "../models/scheduledMeeting.model.js";
import { Feedback } from "../models/feedback.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const JWT_SECRET = process.env.JWT_SECRET || "LiveLinkSuperSecretJWTKey12345";
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || (JWT_SECRET + "_refresh_secret_key");
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "968910378805-07msgdo5roiq6ko7em1mk8g2371ebq6r.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Access token (7 days)
const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user._id, username: user.username, email: user.email, tokenVersion: user.tokenVersion || 0 },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
};

// Refresh token (30 days)
const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user._id, type: "refresh", tokenVersion: user.tokenVersion || 0 },
        REFRESH_SECRET,
        { expiresIn: "30d" }
    );
};

const generateJWT = generateAccessToken;

// Helper to set httpOnly cookies for both access token and refresh token
const setAuthCookies = (res, token, refreshToken) => {
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    if (refreshToken) {
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
    }
};

const setTokenCookie = (res, token) => setAuthCookies(res, token, null);

const clearAuthCookies = (res) => {
    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie("token", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax"
    });
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax"
    });
};

// Helper to extract token from Cookie, Query, Header, or Body (strictly type-safe to prevent NoSQL object injection)
const extractToken = (req) => {
    const raw = (
        req.cookies?.token ||
        req.query?.token ||
        req.body?.token ||
        req.headers?.authorization?.replace(/^Bearer\s+/i, "")
    );
    return (typeof raw === "string" && raw.trim().length > 0) ? raw.trim() : null;
};

// Helper to find user from token (supports both token string and signed JWT, with tokenVersion check)
const findUserFromToken = async (token) => {
    if (!token || typeof token !== "string") return null;
    const cleanToken = String(token).trim();
    if (!cleanToken) return null;

    let user = await User.findOne({ token: cleanToken });
    if (!user) {
        try {
            const decoded = jwt.verify(cleanToken, JWT_SECRET);
            user = await User.findById(decoded.id) || await User.findOne({ username: decoded.username });
            if (user && decoded.tokenVersion !== undefined && user.tokenVersion !== undefined) {
                if (decoded.tokenVersion < user.tokenVersion) return null;
            }
        } catch (e) {
            return null;
        }
    }
    return user;
};

// 1. SMART LOGIN (Supports both Username OR Email, issues signed JWT + httpOnly cookie)
const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Please provide username/email and password" });
    }

    try {
        const user = await User.findOne({
            $or: [
                { username: username.trim() },
                { email: username.trim().toLowerCase() }
            ]
        });

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found with these credentials" });
        }

        if (!user.password) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                message: "This account was created with Google. Please use 'Continue with Google'." 
            });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (isPasswordCorrect) {
            const token = generateAccessToken(user);
            const refreshTokenStr = generateRefreshToken(user);
            user.token = token;
            user.refreshToken = refreshTokenStr;
            user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            await user.save();

            setAuthCookies(res, token, refreshTokenStr);

            return res.status(httpStatus.OK).json({ 
                token: token,
                user: {
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    avatar: user.avatar,
                    emailVerified: Boolean(user.emailVerified),
                    preferences: user.preferences
                }
            });
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid credentials" });
        }
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong: ${e.message}` });
    }
};

// 2. REGISTRATION (Real Email, Full Name, Password, Optional Phone/Avatar, Email Verification Token)
const register = async (req, res) => {
    const { name, username, email, phone, password, avatar } = req.body;

    if (!name || !email || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Full Name, Email Address, and Password are required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Please provide a valid email address (e.g. name@gmail.com)" });
    }

    // Avatar URL security check
    if (avatar && !avatar.startsWith("https://")) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Avatar URL must start with https://" });
    }

    try {
        const existingEmail = await User.findOne({ email: cleanEmail });
        if (existingEmail) {
            return res.status(httpStatus.CONFLICT).json({ message: "This email is already registered. Please sign in." });
        }

        let baseUsername = (username ? username.trim() : cleanEmail.split("@")[0]).toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!baseUsername) baseUsername = `user${Date.now().toString().slice(-4)}`;

        let candidateUsername = baseUsername;
        let counter = 1;
        while (await User.findOne({ username: candidateUsername })) {
            candidateUsername = `${baseUsername}${counter}`;
            counter++;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const defaultAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(candidateUsername)}`;
        const verifyToken = crypto.randomBytes(32).toString("hex");

        const newUser = new User({
            name: name.trim(),
            username: candidateUsername,
            email: cleanEmail,
            phone: phone ? phone.trim() : "",
            password: hashedPassword,
            avatar: defaultAvatar,
            emailVerified: false,
            verificationToken: verifyToken,
            verificationTokenExpires: new Date(Date.now() + 24 * 3600000)
        });

        await newUser.save();
        return res.status(httpStatus.CREATED).json({ 
            message: "Account created successfully! Please verify your email.",
            verificationToken: verifyToken
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Registration error: ${e.message}` });
    }
};

// 3. GOOGLE AUTH (Verified via google-auth-library verifyIdToken)
const googleAuth = async (req, res) => {
    const { credential } = req.body;

    if (!credential) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Google ID token (credential) is required" });
    }

    try {
        // Verify Google ID Token with Google's public keys
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.email_verified) {
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Google account email is not verified" });
        }

        const email = payload.email.trim().toLowerCase();
        const googleId = payload.sub;
        const name = payload.name || email.split("@")[0];
        let avatar = payload.picture;
        if (avatar && !avatar.startsWith("https://")) {
            avatar = null;
        }

        // Find existing user by googleId or email
        let user = await User.findOne({
            $or: [
                { googleId: googleId },
                { email: email }
            ]
        });

        if (user) {
            if (!user.googleId) user.googleId = googleId;
            user.emailVerified = true;
            if (avatar && (!user.avatar || user.avatar.includes("dicebear"))) {
                user.avatar = avatar;
            }
        } else {
            let baseUsername = (email.split("@")[0] || name.replace(/\s+/g, "")).toLowerCase().replace(/[^a-z0-9]/g, "");
            let candidateUsername = baseUsername;
            let counter = 1;
            while (await User.findOne({ username: candidateUsername })) {
                candidateUsername = `${baseUsername}${counter}`;
                counter++;
            }

            user = new User({
                name: name,
                username: candidateUsername,
                email: email,
                googleId: googleId,
                emailVerified: true,
                avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(candidateUsername)}`
            });
        }

        const token = generateAccessToken(user);
        const refreshTokenStr = generateRefreshToken(user);
        user.token = token;
        user.refreshToken = refreshTokenStr;
        user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await user.save();

        setAuthCookies(res, token, refreshTokenStr);

        return res.status(httpStatus.OK).json({
            token: token,
            user: {
                name: user.name,
                username: user.username,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                emailVerified: true,
                preferences: user.preferences
            }
        });
    } catch (e) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: `Google authentication failed: ${e.message}` });
    }
};

// 4. GET USER PROFILE & METRICS (Cookie or Token)
const getUserProfile = async (req, res) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication token required" });
    }

    try {
        const user = await findUserFromToken(token);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }

        const totalMeetings = await Meeting.countDocuments({ user_id: user.username });

        return res.status(httpStatus.OK).json({
            name: user.name,
            username: user.username,
            email: user.email || "",
            phone: user.phone || "",
            avatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`,
            createdAt: user.createdAt,
            totalMeetings: totalMeetings,
            isGoogleUser: Boolean(user.googleId),
            emailVerified: Boolean(user.emailVerified),
            preferences: user.preferences || {
                micMuted: false,
                cameraOff: false,
                chimesEnabled: true,
                captionsEnabled: false,
                theme: "system"
            }
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Profile fetch error: ${e.message}` });
    }
};

// 5. UPDATE USER PROFILE (Strict HTTPS avatar validation)
const updateUserProfile = async (req, res) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication token required" });
    }

    const { name, phone, avatar } = req.body;

    // Strict XSS / Avatar protocol validation
    if (avatar && !avatar.startsWith("https://")) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Avatar URL must start with https://" });
    }

    try {
        const user = await findUserFromToken(token);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }

        if (name && name.trim()) user.name = name.trim();
        if (phone !== undefined) user.phone = phone.trim();
        if (avatar && avatar.trim()) user.avatar = avatar.trim();

        await user.save();

        return res.status(httpStatus.OK).json({
            message: "Profile updated successfully!",
            user: {
                name: user.name,
                username: user.username,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                emailVerified: Boolean(user.emailVerified),
                preferences: user.preferences
            }
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Profile update error: ${e.message}` });
    }
};

// 6. PREFERENCES
const updatePreferences = async (req, res) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication token required" });
    }

    try {
        const user = await findUserFromToken(token);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }

        user.preferences = {
            ...(user.preferences?.toObject ? user.preferences.toObject() : user.preferences),
            ...req.body
        };
        await user.save();

        return res.status(httpStatus.OK).json({
            message: "Preferences updated successfully",
            preferences: user.preferences
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Preferences update error: ${e.message}` });
    }
};

// 7. PASSWORD RESET FLOW
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(httpStatus.OK).json({
                message: "If an account exists with this email, password reset instructions have been prepared."
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
        await user.save();

        const clientOrigin = process.env.CLIENT_URL || "http://localhost:3000";
        const resetLink = `${clientOrigin}/reset-password/${resetToken}`;

        return res.status(httpStatus.OK).json({
            message: "Password reset link generated successfully.",
            resetToken: resetToken,
            resetLink: resetLink
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Forgot password error: ${e.message}` });
    }
};

const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid or expired password reset link." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.token = null;
        await user.save();

        return res.status(httpStatus.OK).json({ message: "Password has been reset successfully! Please sign in with your new password." });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Reset password error: ${e.message}` });
    }
};

// 8. EMAIL VERIFICATION
const verifyEmail = async (req, res) => {
    const { token } = req.body;
    try {
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Invalid or expired email verification link." });
        }

        user.emailVerified = true;
        user.verificationToken = null;
        user.verificationTokenExpires = null;
        await user.save();

        return res.status(httpStatus.OK).json({ message: "Email verified successfully! You are now a Verified Member." });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Email verification error: ${e.message}` });
    }
};

const sendVerificationEmail = async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication required" });

    try {
        const user = await findUserFromToken(token);
        if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        if (user.emailVerified) return res.status(httpStatus.BAD_REQUEST).json({ message: "Email is already verified." });

        const verifyToken = crypto.randomBytes(32).toString("hex");
        user.verificationToken = verifyToken;
        user.verificationTokenExpires = new Date(Date.now() + 24 * 3600000); // 24 hours
        await user.save();

        const clientOrigin = process.env.CLIENT_URL || "http://localhost:3000";
        const verifyLink = `${clientOrigin}/verify-email/${verifyToken}`;

        return res.status(httpStatus.OK).json({
            message: "Verification link generated.",
            verifyToken: verifyToken,
            verifyLink: verifyLink
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Verification send error: ${e.message}` });
    }
};

// 9. SCHEDULED MEETINGS
const scheduleMeeting = async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication required" });

    const { title, meetingCode, startTime, durationMinutes, description } = req.body;
    try {
        const user = await findUserFromToken(token);
        if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });

        const scheduled = new ScheduledMeeting({
            user_id: user.username,
            title: title.trim(),
            meetingCode: meetingCode.trim(),
            startTime: new Date(startTime),
            durationMinutes: durationMinutes || 30,
            description: description ? description.trim() : ""
        });
        await scheduled.save();

        return res.status(httpStatus.CREATED).json({
            message: "Meeting scheduled successfully!",
            meeting: scheduled
        });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Schedule meeting error: ${e.message}` });
    }
};

const getScheduledMeetings = async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication required" });

    try {
        const user = await findUserFromToken(token);
        if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });

        const scheduled = await ScheduledMeeting.find({ user_id: user.username }).sort({ startTime: 1 });
        return res.status(httpStatus.OK).json(scheduled);
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Fetch scheduled meetings error: ${e.message}` });
    }
};

const deleteScheduledMeeting = async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication required" });

    const id = req.params.id || req.body?.id || req.query?.id;
    if (!id) return res.status(httpStatus.BAD_REQUEST).json({ message: "Meeting ID required" });
    try {
        const user = await findUserFromToken(token);
        if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });

        await ScheduledMeeting.deleteOne({ _id: id, user_id: user.username });
        return res.status(httpStatus.OK).json({ message: "Scheduled meeting deleted successfully" });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Delete scheduled meeting error: ${e.message}` });
    }
};

// 10. POST-CALL FEEDBACK
const submitFeedback = async (req, res) => {
    const token = extractToken(req);
    let username = null;
    if (token) {
        const user = await findUserFromToken(token);
        if (user) username = user.username;
    }

    const { meetingCode, rating, feedback } = req.body;
    try {
        const fb = new Feedback({
            user_id: username,
            meetingCode,
            rating,
            feedback: feedback || ""
        });
        await fb.save();
        return res.status(httpStatus.CREATED).json({ message: "Feedback submitted successfully! Thank you for rating LiveLink." });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Feedback error: ${e.message}` });
    }
};

// 11. MEETING HISTORY (With Duration & Participant Count)
const getUserHistory = async (req, res) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication token required" });
    }

    try {
        const user = await findUserFromToken(token);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }
        const meetings = await Meeting.find({ user_id: user.username }).sort({ date: -1 });
        return res.json(meetings);
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `History fetch error: ${e.message}` });
    }
};

const addToHistory = async (req, res) => {
    const token = extractToken(req);
    const { meeting_code, duration, participantCount } = req.body;

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication token required" });
    }

    try {
        const user = await findUserFromToken(token);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code,
            date: new Date(),
            duration: Number(duration) || 0,
            participantCount: Number(participantCount) || 1
        });

        await newMeeting.save();
        return res.status(httpStatus.CREATED).json({ message: "Added code to history", meeting: newMeeting });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Add history error: ${e.message}` });
    }
};

const deleteHistory = async (req, res) => {
    const token = extractToken(req);
    const { id } = req.body;

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication token required" });
    }

    try {
        const user = await findUserFromToken(token);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }

        await Meeting.deleteOne({
            _id: id,
            user_id: user.username
        });

        return res.status(httpStatus.OK).json({ message: "History deleted successfully" });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Delete history error: ${e.message}` });
    }
};

// 12. LOGOUT & DEVICE MANAGEMENT
const logout = async (req, res) => {
    try {
        const token = extractToken(req);
        if (token) {
            const user = await findUserFromToken(token);
            if (user) {
                user.refreshToken = null;
                user.refreshTokenExpires = null;
                user.token = null;
                await user.save();
            }
        }
    } catch (e) {
        // Proceed with cookie clearance even on error
    }
    clearAuthCookies(res);
    return res.status(httpStatus.OK).json({ message: "Logged out successfully" });
};

const logoutAllDevices = async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication required" });

    try {
        const user = await findUserFromToken(token);
        if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });

        user.token = null;
        user.refreshToken = null;
        user.refreshTokenExpires = null;
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();

        clearAuthCookies(res);

        return res.status(httpStatus.OK).json({ message: "Successfully logged out from all devices." });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Logout all error: ${e.message}` });
    }
};

// 13. DELETE ACCOUNT
const deleteAccount = async (req, res) => {
    const token = extractToken(req);
    if (!token) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Authentication required" });

    try {
        const user = await findUserFromToken(token);
        if (!user) return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });

        await Meeting.deleteMany({ user_id: user.username });
        await ScheduledMeeting.deleteMany({ user_id: user.username });
        await User.deleteOne({ _id: user._id });

        clearAuthCookies(res);

        return res.status(httpStatus.OK).json({ message: "Account and all associated meetings deleted permanently." });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Delete account error: ${e.message}` });
    }
};

// 14. REFRESH TOKEN (Issues fresh access token using secure httpOnly refresh cookie)
const refreshToken = async (req, res) => {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Refresh token is required" });
    }
    try {
        const decoded = jwt.verify(token, REFRESH_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || user.refreshToken !== token) {
            clearAuthCookies(res);
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid or expired refresh token" });
        }
        if (decoded.tokenVersion !== undefined && user.tokenVersion !== undefined && decoded.tokenVersion < user.tokenVersion) {
            clearAuthCookies(res);
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Token has been revoked" });
        }

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        user.token = newAccessToken;
        user.refreshToken = newRefreshToken;
        user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await user.save();

        setAuthCookies(res, newAccessToken, newRefreshToken);
        return res.status(httpStatus.OK).json({ 
            token: newAccessToken,
            message: "Token refreshed successfully" 
        });
    } catch (err) {
        clearAuthCookies(res);
        return res.status(httpStatus.UNAUTHORIZED).json({ message: "Refresh token failed or expired" });
    }
};

// 15. ICE & TURN CREDENTIALS ENDPOINT (With support for short-lived credentials via TURN_SECRET)
const getIceServers = async (req, res) => {
    const servers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
    ];

    if (process.env.TURN_URL) {
        let username = process.env.TURN_USER || process.env.TURN_USERNAME || "";
        let credential = process.env.TURN_PASS || process.env.TURN_CREDENTIAL || "";

        // Ephemeral short-lived credentials using HMAC-SHA1 (RFC 5766 TURN REST API)
        if (process.env.TURN_SECRET) {
            const ttl = parseInt(process.env.TURN_TTL_SECONDS, 10) || 86400; // 24 hours
            const expiryTimestamp = Math.floor(Date.now() / 1000) + ttl;
            const clientIdentifier = req.user?.username || "livelink-peer";
            username = `${expiryTimestamp}:${clientIdentifier}`;

            const hmac = crypto.createHmac("sha1", process.env.TURN_SECRET);
            hmac.update(username);
            credential = hmac.digest("base64");
        }

        const rawUrls = process.env.TURN_URL.includes(",")
            ? process.env.TURN_URL.split(",").map(u => u.trim())
            : [process.env.TURN_URL];

        if (process.env.TURN_URL.includes("standard.relay.metered.ca") && !rawUrls.some(u => u.includes("turns:"))) {
            rawUrls.push("turns:standard.relay.metered.ca:443?transport=tcp");
        }

        servers.push({
            urls: rawUrls.length === 1 ? rawUrls[0] : rawUrls,
            username: username,
            credential: credential
        });
    }

    return res.status(httpStatus.OK).json({ iceServers: servers });
};

export { 
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
};