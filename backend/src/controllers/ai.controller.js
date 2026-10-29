import httpStatus from "http-status";

// Step 9: In-memory rate limiting per room and per user/IP (zero transcript persistence)
const lastRoomSummaryRequest = new Map();
const lastUserSummaryRequest = new Map();

/**
 * Generates an executive meeting summary via Google Gemini.
 * Model name is loaded strictly from env GEMINI_MODEL (fallback: gemini-3.5-flash).
 * Never stores or persists transcripts to MongoDB or disk.
 */
export const generateMeetingSummary = async (req, res) => {
    try {
        const { roomCode, transcript } = req.body;

        if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "A meeting transcript is required to generate a summary."
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(httpStatus.SERVICE_UNAVAILABLE).json({
                message: "Gemini AI summary is not configured on this server. Set GEMINI_API_KEY in environment."
            });
        }

        const cleanRoom = (roomCode || "default-room").toLowerCase().trim();
        const now = Date.now();

        // Rate limit per room: maximum 1 request per 30 seconds
        const lastRoomTime = lastRoomSummaryRequest.get(cleanRoom) || 0;
        if (now - lastRoomTime < 30000) {
            return res.status(httpStatus.TOO_MANY_REQUESTS).json({
                message: "AI rate limit reached for this room. Please wait 30 seconds before requesting another summary."
            });
        }

        // Rate limit per user/IP: maximum 1 request per 15 seconds
        const userKey = req.user?.id || req.ip || "anonymous";
        const lastUserTime = lastUserSummaryRequest.get(userKey) || 0;
        if (now - lastUserTime < 15000) {
            return res.status(httpStatus.TOO_MANY_REQUESTS).json({
                message: "AI rate limit reached. Please try again in a minute."
            });
        }

        lastRoomSummaryRequest.set(cleanRoom, now);
        lastUserSummaryRequest.set(userKey, now);

        // Sanitize transcript: limit to 20,000 characters
        const sanitizedTranscript = transcript.slice(0, 20000);

        // Read model from env GEMINI_MODEL
        const geminiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";

        const prompt = `You are a meeting assistant. Analyze the following meeting transcript and produce a concise, professional summary formatted in clean markdown.
Include:
1. **Meeting Overview & Key Objectives**
2. **Key Discussion Points**
3. **Decisions Made**
4. **Action Items & Next Steps (with assignees if mentioned)**

Transcript:
"""
${sanitizedTranscript}
"""`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

        const response = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 1024
                }
            })
        });

        // Step 9: Friendly message on 429
        if (response.status === 429) {
            return res.status(httpStatus.TOO_MANY_REQUESTS).json({
                message: "AI rate limit reached. Please try again in a minute."
            });
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.warn("[Gemini API] Error response:", response.status, errData);
            return res.status(httpStatus.BAD_GATEWAY).json({
                message: "AI service temporarily unavailable. Please try again shortly."
            });
        }

        const data = await response.json();
        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No summary could be generated from the provided transcript.";

        // Notice: The transcript is NEVER stored in MongoDB or written to disk.
        return res.status(httpStatus.OK).json({
            summary: candidateText,
            model: geminiModel,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error("[generateMeetingSummary] Unexpected error:", error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: "Failed to generate meeting summary. Please try again."
        });
    }
};
