import mongoose, { Schema } from "mongoose";

const feedbackSchema = new Schema(
    {
        user_id: { type: String, default: null },
        meetingCode: { type: String, required: true, trim: true },
        rating: { type: Number, min: 1, max: 5, required: true },
        feedback: { type: String, default: "", trim: true },
        createdAt: { type: Date, default: Date.now }
    }
);

const Feedback = mongoose.model("Feedback", feedbackSchema);

export { Feedback };
