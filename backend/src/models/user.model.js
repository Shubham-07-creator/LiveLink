import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        username: { type: String, required: true, unique: true, trim: true },
        email: { type: String, trim: true, lowercase: true, index: true },
        phone: { type: String, trim: true, default: "" },
        password: { type: String }, // Optional for Google OAuth users
        token: { type: String },
        refreshToken: { type: String, default: null },
        refreshTokenExpires: { type: Date, default: null },
        avatar: { type: String, default: "https://api.dicebear.com/7.x/bottts/svg?seed=LiveLink" },
        googleId: { type: String, default: null, index: true },
        emailVerified: { type: Boolean, default: false },
        verificationToken: { type: String, default: null },
        verificationTokenExpires: { type: Date, default: null },
        resetPasswordToken: { type: String, default: null },
        resetPasswordExpires: { type: Date, default: null },
        preferences: {
            micMuted: { type: Boolean, default: false },
            cameraOff: { type: Boolean, default: false },
            chimesEnabled: { type: Boolean, default: true },
            captionsEnabled: { type: Boolean, default: false },
            theme: { type: String, default: "system" }
        },
        tokenVersion: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now }
    }
);

const User = mongoose.model("User", userSchema);

export { User };