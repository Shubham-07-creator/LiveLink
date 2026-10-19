import mongoose, { Schema } from "mongoose";


const meetingSchema = new Schema(
    {
        user_id: { type: String },
        meetingCode: { type: String, required: true },
        date: { type: Date, default: Date.now, required: true },
        duration: { type: Number, default: 0 }, // in seconds
        participantCount: { type: Number, default: 1 },
        participants: [{ type: String }]
    }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export { Meeting };