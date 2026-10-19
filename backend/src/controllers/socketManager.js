import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "LiveLinkSuperSecretJWTKey12345";
const MAX_ROOM_PARTICIPANTS = 6;

let connections = {};
let messages = {};
let timeOnline = {};
let userNames = {};
let userAvatars = {};

// Host Controls & Waiting Room State
let roomHosts = {};
let roomLocked = {};
let waitingRooms = {};

export const connectToSocket = (server) => {
    const clientOrigin = process.env.CLIENT_URL || "http://localhost:3000";

    const io = new Server(server, {
        cors: {
            origin: clientOrigin,
            methods: ["GET", "POST"],
            allowedHeaders: ["Content-Type", "Authorization"],
            credentials: true
        }
    });

    // Helper to find the room a socket belongs to
    const getSocketRoom = (socketId) => {
        return Object.entries(connections).reduce(
            ([room, isFound], [roomKey, roomValue]) => {
                if (!isFound && roomValue.includes(socketId)) {
                    return [roomKey, true];
                }
                return [room, isFound];
            },
            ["", false]
        );
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
                ? username.trim().slice(0, 50).replace(/[<>]/g, "") 
                : (socket.user?.username || "User");
            const safeAvatar = (typeof avatar === "string" && avatar.startsWith("https://")) ? avatar : null;

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

            // MESH LIMIT: 6 participants maximum
            if (connections[path].length >= MAX_ROOM_PARTICIPANTS) {
                socket.emit("room-full", {
                    message: "This meeting room has reached the maximum capacity of 6 participants for peer-to-peer calling.",
                    max: MAX_ROOM_PARTICIPANTS
                });
                return;
            }

            if (!connections[path].includes(socket.id)) {
                connections[path].push(socket.id);
            }

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
            io.to(toId).emit("signal", socket.id, message);
        });

        socket.on("chat-message", (data, sender) => {
            if (typeof data !== "string" || !data.trim()) return;

            let safeData;
            if (data.startsWith("data:image/")) {
                if (data.length > 3 * 1024 * 1024) return; // Max ~2MB image
                safeData = data;
            } else {
                safeData = data.trim().slice(0, 2000);
            }
            const safeSender = typeof sender === "string" 
                ? sender.trim().slice(0, 50).replace(/[<>]/g, "") 
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
            let key;

            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k;

                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit("user-left", socket.id);
                        }

                        const index = connections[key].indexOf(socket.id);
                        connections[key].splice(index, 1);

                        delete userNames[socket.id];
                        delete userAvatars[socket.id];
                        delete timeOnline[socket.id];

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
                            }
                        }

                        if (connections[key].length === 0) {
                            delete connections[key];
                        }
                    }
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