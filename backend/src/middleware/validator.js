import { z } from "zod";
import httpStatus from "http-status";

export const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            const parsed = schema.parse(req.body);
            req.body = parsed;
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const message = error.issues ? error.issues.map(e => e.message).join(", ") : error.message;
                return res.status(httpStatus.BAD_REQUEST).json({
                    message: `Validation failed: ${message}`
                });
            }
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "Invalid request data"
            });
        }
    };
};

export const registerSchema = z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters long").max(100),
    email: z.string().trim().email("Please provide a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long").max(128),
    username: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    avatar: z.string().trim().refine(val => !val || val.startsWith("https://"), {
        message: "Avatar URL must start with https://"
    }).optional()
});

export const loginSchema = z.object({
    username: z.string().trim().min(1, "Username or email is required"),
    password: z.string().min(1, "Password is required")
});

export const googleAuthSchema = z.object({
    credential: z.string().min(10, "Valid Google ID token (credential) is required")
});

export const updateProfileSchema = z.object({
    token: z.string().optional(),
    name: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().optional(),
    avatar: z.string().trim().refine(val => !val || val.startsWith("https://"), {
        message: "Avatar URL must start with https://"
    }).optional()
});

export const addToHistorySchema = z.object({
    meeting_code: z.string().trim().min(1, "Meeting code is required"),
    duration: z.number().nonnegative().optional(),
    participantCount: z.number().int().positive().optional(),
    token: z.string().optional()
});

export const forgotPasswordSchema = z.object({
    email: z.string().trim().email("Please provide a valid email address")
});

export const resetPasswordSchema = z.object({
    token: z.string().trim().min(1, "Reset token is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters long").max(128)
});

export const verifyEmailSchema = z.object({
    token: z.string().trim().min(1, "Verification token is required")
});

export const preferencesSchema = z.object({
    micMuted: z.boolean().optional(),
    cameraOff: z.boolean().optional(),
    chimesEnabled: z.boolean().optional(),
    captionsEnabled: z.boolean().optional(),
    theme: z.enum(["light", "dark", "system"]).optional()
});

export const scheduleMeetingSchema = z.object({
    title: z.string().trim().min(2, "Title must be at least 2 characters").max(100),
    meetingCode: z.string().trim().min(1, "Meeting code is required"),
    startTime: z.string().or(z.date()),
    durationMinutes: z.number().int().positive().optional(),
    description: z.string().trim().max(500).optional()
});

export const feedbackSchema = z.object({
    meetingCode: z.string().trim().min(1, "Meeting code is required"),
    rating: z.number().int().min(1).max(5),
    feedback: z.string().trim().max(1000).optional()
});
