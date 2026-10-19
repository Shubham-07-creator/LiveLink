import mongoose, { Schema } from "mongoose";

const scheduledMeetingSchema = new Schema(
    {
        user_id: { type: String, required: true },
        title: { type: String, required: true, trim: true },
        meetingCode: { type: String, required: true, trim: true },
        startTime: { type: Date, required: true },
        durationMinutes: { type: Number, default: 30 },
        description: { type: String, default: "", trim: true },
        createdAt: { type: Date, default: Date.now }
    }
);

const ScheduledMeeting = mongoose.model("ScheduledMeeting", scheduledMeetingSchema);

export { ScheduledMeeting };
