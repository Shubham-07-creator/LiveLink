import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "LiveLinkSuperSecretJWTKey12345";
const MAX_ROOM_PARTICIPANTS = parseInt(process.env.MAX_ROOM_PARTICIPANTS, 10) || 4;

let connections = {};
let messages = {};
let timeOnline = {};
let userNames = {};
let userAvatars = {};

// Fast O(1) reverse lookup: socket.id -> room code
const socketToRoom = new Map();

// Host Controls & Waiting Room State
let roomHosts = {};
let roomLocked = {};
let waitingRooms = {};

// Join rate limiter tracking (max 20 join attempts per minute per IP)
const joinAttempts = new Map();
const isJoinRateLimited = (ip) => {
    const now = Date.now();
    const timestamps = joinAttempts.get(ip) || [];
    const recent = timestamps.filter(t => now - t < 60000);
    if (recent.length >= 20) return true;
    recent.push(now);
    joinAttempts.set(ip, recent);
    return false;
};

// Periodic cleanup of join rate limiter map to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of joinAttempts.entries()) {
        const active = timestamps.filter(t => now - t < 60000);
        if (active.length === 0) {
            joinAttempts.delete(ip);
        } else {
            joinAttempts.set(ip, active);
        }
    }
}, 5 * 60 * 1000).unref();

export const connectToSocket = (server) => {
    const allowedOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://livelink-svqx.onrender.com",
        process.env.CLIENT_URL
    ].filter(Boolean);

    const io = new Server(server, {
        transports: ["websocket", "polling"],
        perMessageDeflate: false, // Low-latency WebRTC signaling without zlib compression overhead
        pingInterval: 10000,
        pingTimeout: 5000,
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                if (
                    allowedOrigins.includes(origin) ||
                    origin.endsWith(".onrender.com") ||
                    origin.startsWith("http://localhost:")
                ) {
                    return callback(null, true);
                }
                return callback(new Error("CORS policy violation: " + origin));
            },
            methods: ["GET", "POST"],
            allowedHeaders: ["Content-Type", "Authorization"],
            credentials: true
        }
    });

    // Helper to find the room a socket belongs to (O(1) fast lookup)
    const getSocketRoom = (socketId) => {
        const cached = socketToRoom.get(socketId);
        if (cached && connections[cached] && connections[cached].includes(socketId)) {
            return [cached, true];
        }
        for (const [roomKey, roomValue] of Object.entries(connections)) {
            if (roomValue.includes(socketId)) {
                socketToRoom.set(socketId, roomKey);
                return [roomKey, true];
            }
        }
        return ["", false];
    };

    // Validate JWT in Socket.IO middleware if token provided
    io.use((socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.cookie
                    ?.split("token=")[1]
                    ?.split(";")[0];

            if (token) {
                try {
                    const decoded = jwt.verify(token, JWT_SECRET);
                    socket.user = decoded;
                } catch (err) {
                    console.warn(`Socket [${socket.id}] token verification warning:`, err.message);
                }
            }
        } catch (e) {
            console.error("Socket auth error:", e);
        }
        next();
    });

    // Room code validation helpers
    const roomCodeRegex = /^[a-z0-9]{3,6}-[a-z0-9]{3,6}-[a-z0-9]{3,6}$/i;
    const slugRegex = /^[a-zA-Z0-9_-]{3,50}$/;

    const normalizeRoomCode = (rawPath) => {
        if (!rawPath || typeof rawPath !== "string") return "";
        return rawPath.replace(/^https?:\/\/[^/]+\/?/i, "").replace(/^\//, "").split("?")[0].trim().toLowerCase();
    };

    const isValidRoomCode = (code) => {
        return Boolean(code && (roomCodeRegex.test(code) || slugRegex.test(code)));
    };

    io.on("connection", (socket) => {
        // Query room participants for Lobby preview
        socket.on("get-room-info", (rawPath) => {
            const path = normalizeRoomCode(rawPath);
            if (!isValidRoomCode(path)) {
                return socket.emit("room-info", {
                    path,
                    count: 0,
                    participants: [],
                    isLocked: false
                });
            }

            const roomClients = connections[path] || [];
            const participants = roomClients.map(id => ({
                socketId: id,
                name: userNames[id] || "Participant",
                avatar: userAvatars[id] || null
            }));

            socket.emit("room-info", {
                path,
                count: roomClients.length,
                participants,
                isLocked: Boolean(roomLocked[path])
            });
        });

        socket.on("join-call", (rawPath, username, token, avatar, isAdmitted = false) => {
            const clientIp = socket.handshake.headers["x-forwarded-for"] || socket.handshake.address || "unknown";
            if (isJoinRateLimited(clientIp)) {
                socket.emit("join-error", { message: "Too many join requests. Please slow down and try again in a minute." });
                return;
            }

            const path = normalizeRoomCode(rawPath);
            if (!isValidRoomCode(path)) {
                socket.emit("join-error", { message: "Invalid room code format. Please check the meeting link." });
                return;
            }

            // Token verification on join-call
            if (token && !socket.user) {
                try {
                    socket.user = jwt.verify(token, JWT_SECRET);
                } catch (e) {
                    console.warn(`Invalid token on join-call for socket ${socket.id}`);
                }
            }

            const safeUsername = typeof username === "string" 
                ? username.replace(/<\/?[^>]+(>|$)/g, "").trim().slice(0, 50) 
                : (socket.user?.username || "User");
            const safeAvatar = (typeof avatar === "string" && /^https:\/\/[^\s$.?#].[^\s]*$/i.test(avatar)) ? avatar : null;

            if (!connections[path]) {
                connections[path] = [];
                roomHosts[path] = socket.id;
                roomLocked[path] = false;
                waitingRooms[path] = [];
            }

            // WAITING ROOM CHECK: When locked, non-host users wait unless admitted
            if (roomLocked[path] && socket.id !== roomHosts[path] && !isAdmitted) {
                if (!waitingRooms[path]) waitingRooms[path] = [];
                const existingIndex = waitingRooms[path].findIndex(u => u.socketId === socket.id);
                if (existingIndex === -1) {
                    waitingRooms[path].push({
                        socketId: socket.id,
                        username: safeUsername,
                        avatar: safeAvatar,
                        time: new Date()
                    });
                } else {
                    waitingRooms[path][existingIndex].username = safeUsername;
                    waitingRooms[path][existingIndex].avatar = safeAvatar;
                }

                socket.emit("waiting-for-admission", {
                    message: "This room is locked by the host. Please wait to be admitted.",
                    path
                });

                if (roomHosts[path]) {
                    io.to(roomHosts[path]).emit("waiting-users-list", waitingRooms[path]);
                    io.to(roomHosts[path]).emit("user-waiting", {
                        socketId: socket.id,
                        username: safeUsername,
                        avatar: safeAvatar
                    });
                }
                return;
            }

            // MESH LIMIT: 4 participants maximum (env-configurable)
            if (connections[path].length >= MAX_ROOM_PARTICIPANTS) {
                socket.emit("room-full", {
                    message: `This meeting room has reached the maximum capacity of ${MAX_ROOM_PARTICIPANTS} participants for peer-to-peer mesh calling.`,
                    max: MAX_ROOM_PARTICIPANTS
                });
                return;
            }

            if (!connections[path].includes(socket.id)) {
                connections[path].push(socket.id);
            }
            socketToRoom.set(socket.id, path);

            userNames[socket.id] = safeUsername || "User";
            userAvatars[socket.id] = safeAvatar;
            timeOnline[socket.id] = new Date();

            // Set or preserve room host (creator is first in room)
            if (!roomHosts[path] || !connections[path].includes(roomHosts[path])) {
                roomHosts[path] = connections[path][0];
            }

            let roomUserNamesMap = {};
            let roomUserAvatarsMap = {};
            connections[path].forEach((id) => {
                roomUserNamesMap[id] = userNames[id] || "User";
                roomUserAvatarsMap[id] = userAvatars[id] || null;
            });

            const hostSocketId = roomHosts[path];

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit(
                    "user-joined", 
                    socket.id, 
                    connections[path], 
                    roomUserNamesMap, 
                    roomUserAvatarsMap, 
                    hostSocketId,
                    Boolean(roomLocked[path])
                );
            }

            // Send host the current waiting room list
            if (socket.id === hostSocketId && waitingRooms[path] && waitingRooms[path].length > 0) {
                io.to(socket.id).emit("waiting-users-list", waitingRooms[path]);
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit(
                        "chat-message",
                        messages[path][a]["data"],
                        messages[path][a]["sender"],
                        messages[path][a]["socket-id-sender"]
                    );
                }
            }
        });

        socket.on("signal", (toId, message) => {
            const [matchingRoom, found] = getSocketRoom(socket.id);
            // Security check: Only forward WebRTC signals between participants in the exact same room
            if (found && connections[matchingRoom] && connections[matchingRoom].includes(toId)) {
                io.to(toId).emit("signal", socket.id, message);
            }
        });

        socket.on("chat-message", (data, sender) => {
            if (typeof data !== "string" || !data.trim()) return;

            let safeData;
            // Strict image MIME check and 2MB raw (<= 2.8MB base64) limit
            if (data.startsWith("data:image/")) {
                const imageMimeRegex = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
                if (data.length > 2.8 * 1024 * 1024 || !imageMimeRegex.test(data)) {
                    socket.emit("chat-error", "Image must be PNG, JPEG, WEBP, or GIF and under 2MB.");
                    return;
                }
                safeData = data;
            } else {
                safeData = data.replace(/<\/?[^>]+(>|$)/g, "").trim().slice(0, 2000);
            }
            if (!safeData) return;

            const safeSender = typeof sender === "string" 
                ? sender.replace(/<\/?[^>]+(>|$)/g, "").trim().slice(0, 50) 
                : (userNames[socket.id] || "User");

            const [matchingRoom, found] = getSocketRoom(socket.id);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = [];
                }

                messages[matchingRoom].push({
                    sender: safeSender,
                    data: safeData,
                    "socket-id-sender": socket.id
                });

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", safeData, safeSender, socket.id);
                });
            }
        });

        // CHAT TYPING INDICATORS
        socket.on("typing", () => {
            const [matchingRoom, found] = getSocketRoom(socket.id);
            if (found) {
                connections[matchingRoom].forEach((elem) => {
                    if (elem !== socket.id) {
                        io.to(elem).emit("user-typing", {
                            socketId: socket.id,
                            username: userNames[socket.id] || "Someone"
                        });
                    }
                });
            }
        });

        socket.on("stop-typing", () => {
            const [matchingRoom, found] = getSocketRoom(socket.id);
            if (found) {
                connections[matchingRoom].forEach((elem) => {
                    if (elem !== socket.id) {
                        io.to(elem).emit("user-stop-typing", {
                            socketId: socket.id
                        });
                    }
                });
            }
        });

        // LIVE CLOSED CAPTIONS RELAY (Google Meet Style Real-Time Subtitles)
        socket.on("live-caption", (transcript, speaker) => {
            if (typeof transcript !== "string" || !transcript.trim()) return;
            const safeTranscript = transcript.slice(0, 300);
            const safeSpeaker = typeof speaker === "string" ? speaker.slice(0, 50) : (userNames[socket.id] || "Participant");
            const [matchingRoom, found] = getSocketRoom(socket.id);
            if (found) {
                connections[matchingRoom].forEach((elem) => {
                    if (elem !== socket.id) {
                        io.to(elem).emit("remote-caption", { text: safeTranscript, speaker: safeSpeaker, socketId: socket.id });
                    }
                });
            }
        });

        socket.on("reaction", (emoji, sender) => {
            if (typeof emoji !== "string" || emoji.length > 8) return;

            const safeSender = typeof sender === "string" 
                ? sender.trim().slice(0, 50).replace(/[<>]/g, "") 
                : (userNames[socket.id] || "User");

            const [matchingRoom, found] = getSocketRoom(socket.id);

            if (found === true) {
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("reaction", emoji, safeSender, socket.id);
                });
            }
        });

        socket.on("raise-hand", (isRaised, sender) => {
            const safeSender = typeof sender === "string" 
                ? sender.trim().slice(0, 50).replace(/[<>]/g, "") 
                : (userNames[socket.id] || "User");

            const [matchingRoom, found] = getSocketRoom(socket.id);

            if (found === true) {
                const hostSocketId = roomHosts[matchingRoom] || connections[matchingRoom][0];
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("raise-hand", Boolean(isRaised), safeSender, socket.id, hostSocketId);
                });
            }
        });

        // Meeting Recording Broadcast
        socket.on("recording-started", (hostName) => {
            const [matchingRoom, found] = getSocketRoom(socket.id);

            if (found === true) {
                const recorder = hostName || userNames[socket.id] || "Host";
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("recording-status", {
                        isRecording: true,
                        host: recorder
                    });
                });
            }
        });

        socket.on("recording-stopped", () => {
            const [matchingRoom, found] = getSocketRoom(socket.id);

            if (found === true) {
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("recording-status", {
                        isRecording: false
                    });
                });
            }
        });

        // =========================================================================
        // HOST CONTROL EVENTS (Validated on Server: Only Host Can Emit)
        // =========================================================================

        // Host Control: Lock / Unlock Room
        socket.on("lock-room", (isLocked) => {
            const [matchingRoom, found] = getSocketRoom(socket.id);
            if (!found) return;

            if (roomHosts[matchingRoom] !== socket.id) {
                return socket.emit("host-action-error", "Only the host can lock or unlock this room.");
            }

            roomLocked[matchingRoom] = Boolean(isLocked);
            connections[matchingRoom].forEach((elem) => {
                io.to(elem).emit("room-lock-changed", { isLocked: roomLocked[matchingRoom] });
            });
        });

        // Host Control: Admit User from Waiting Room
        socket.on("admit-user", (targetSocketId) => {
            const [matchingRoom, found] = getSocketRoom(socket.id);
            if (!found) return;

            if (roomHosts[matchingRoom] !== socket.id) {
                return socket.emit("host-action-error", "Only the host can admit participants.");
            }

            if (waitingRooms[matchingRoom]) {
                waitingRooms[matchingRoom] = waitingRooms[matchingRoom].filter(u => u.socketId !== targetSocketId);
                io.to(socket.id).emit("waiting-users-list", waitingRooms[matchingRoom]);
            }
            io.to(targetSocketId).emit("admission-granted");
        });

        // Host Control: Deny User from Waiting Room
        socket.on("deny-user", (targetSocketId) => {
            const [matchingRoom, found] = getSocketRoom(socket.id);
            if (!found) return;

            if (roomHosts[matchingRoom] !== socket.id) {
                return socket.emit("host-action-error", "Only the host can deny participants.");
            }

            if (waitingRooms[matchingRoom]) {
                waitingRooms[matchingRoom] = waitingRooms[matchingRoom].filter(u => u.socketId !== targetSocketId);
                io.to(socket.id).emit("waiting-users-list", waitingRooms[matchingRoom]);
            }
            io.to(targetSocketId).emit("admission-denied", {
                message: "The host has declined your request to join this meeting."
            });
        });

        // Query waiting users list
        socket.on("get-waiting-users", () => {
            const [matchingRoom, found] = getSocketRoom(socket.id);
            if (found && roomHosts[matchingRoom] === socket.id) {
                socket.emit("waiting-users-list", waitingRooms[matchingRoom] || []);
            }
        });

        // Host Control: Mute a Specific Participant
        socket.on("mute-participant", (targetSocketId) => {
            const [matchingRoom, found] = getSocketRoom(socket.id);
            if (!found) return;

            if (roomHosts[matchingRoom] !== socket.id) {
                return socket.emit("host-action-error", "Only the host can mute participants.");
            }

            io.to(targetSocketId).emit("force-mute", { mutedBy: userNames[socket.id] || "Host" });
            connections[matchingRoom].forEach((elem) => {
                io.to(elem).emit("participant-muted", {
                    targetSocketId,
                    targetName: userNames[targetSocketId] || "Participant",
                    mutedBy: userNames[socket.id] || "Host"
                });
            });
        });

        // Host Control: Mute All Participants
        socket.on("mute-all", () => {
            const [matchingRoom, found] = getSocketRoom(socket.id);
            if (!found) return;

            if (roomHosts[matchingRoom] !== socket.id) {
                return socket.emit("host-action-error", "Only the host can mute all participants.");
            }

            connections[matchingRoom].forEach((elem) => {
                if (elem !== socket.id) {
                    io.to(elem).emit("force-mute", { mutedBy: userNames[socket.id] || "Host" });
                }
                io.to(elem).emit("all-muted", { mutedBy: userNames[socket.id] || "Host" });
            });
        });

        // Host Control: Remove / Kick a Participant
        socket.on("remove-participant", (targetSocketId) => {
            const [matchingRoom, found] = getSocketRoom(socket.id);
            if (!found) return;

            if (roomHosts[matchingRoom] !== socket.id) {
                return socket.emit("host-action-error", "Only the host can remove participants.");
            }

            io.to(targetSocketId).emit("user-removed", {
                message: "You have been removed from this meeting by the host."
            });

            const index = connections[matchingRoom].indexOf(targetSocketId);
            if (index !== -1) {
                connections[matchingRoom].splice(index, 1);
            }
            socketToRoom.delete(targetSocketId);

            connections[matchingRoom].forEach((elem) => {
                io.to(elem).emit("user-left", targetSocketId);
            });
        });

        // Host Control: Spotlight Participant for Everyone
        socket.on("spotlight-participant", (targetSocketId) => {
            const [matchingRoom, found] = getSocketRoom(socket.id);
            if (!found) return;

            if (roomHosts[matchingRoom] !== socket.id) {
                return socket.emit("host-action-error", "Only the host can spotlight participants for everyone.");
            }

            connections[matchingRoom].forEach((elem) => {
                io.to(elem).emit("spotlight-changed", {
                    spotlightId: targetSocketId,
                    spotlightName: targetSocketId ? (userNames[targetSocketId] || "Participant") : null
                });
            });
        });

        socket.on("disconnect", () => {
            const [key, found] = getSocketRoom(socket.id);

            if (found && connections[key]) {
                const index = connections[key].indexOf(socket.id);
                if (index !== -1) {
                    connections[key].splice(index, 1);
                }

                // Notify remaining participants
                connections[key].forEach((elem) => {
                    io.to(elem).emit("user-left", socket.id);
                });

                delete userNames[socket.id];
                delete userAvatars[socket.id];
                delete timeOnline[socket.id];
                socketToRoom.delete(socket.id);

                // HOST REASSIGNMENT: If host leaves, designate next oldest participant
                if (roomHosts[key] === socket.id) {
                    if (connections[key].length > 0) {
                        roomHosts[key] = connections[key][0];
                        const newHostName = userNames[roomHosts[key]] || "Host";
                        connections[key].forEach((elem) => {
                            io.to(elem).emit("host-changed", { hostSocketId: roomHosts[key], hostName: newHostName });
                        });
                    } else {
                        delete roomHosts[key];
                        delete roomLocked[key];
                        delete waitingRooms[key];
                        delete messages[key];
                    }
                }

                // ROOM TEARDOWN: Prevent in-memory chat/room memory leaks
                if (connections[key].length === 0) {
                    delete connections[key];
                    delete messages[key];
                    delete roomHosts[key];
                    delete roomLocked[key];
                    delete waitingRooms[key];
                }
            }

            // Remove from waiting rooms if disconnected
            for (let r in waitingRooms) {
                if (waitingRooms[r]) {
                    waitingRooms[r] = waitingRooms[r].filter(u => u.socketId !== socket.id);
                }
            }
        });
    });

    return io;
};