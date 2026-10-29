import { useState, useRef, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import server from '../environment';
import { playChime } from '../utils/audioChimes';

export default function useSignaling({
    roomUrl,
    userData,
    onSignalReceived,
    onUserJoined,
    onUserLeft,
    onForceMute,
    onForceVideoOff,
    onMeetingEndedByHost,
    onUserRemoved,
    onRoomFull
} = {}) {
    const socketRef = useRef(null);
    const socketIdRef = useRef('');
    const [socketId, setSocketId] = useState('');
    const [hostSocketId, setHostSocketId] = useState('');
    const [isRoomLocked, setIsRoomLocked] = useState(false);
    const [roomPermissions, setRoomPermissions] = useState({ allowScreenShare: true, allowChat: true });
    const [isPrivateCall, setIsPrivateCall] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessagesCount, setNewMessagesCount] = useState(0);
    const [typingUser, setTypingUser] = useState(null);
    const [raisedHands, setRaisedHands] = useState({});
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [reactions, setReactions] = useState([]);
    const [waitingUsers, setWaitingUsers] = useState([]);
    const [isWaitingForAdmission, setIsWaitingForAdmission] = useState(false);
    const [admissionDenied, setAdmissionDenied] = useState(false);
    const [spotlightUser, setSpotlightUser] = useState(null);
    const [remoteRecording, setRemoteRecording] = useState({ isRecording: false, host: '' });
    const [remoteCaption, setRemoteCaption] = useState(null);
    const [activePresenter, setActivePresenter] = useState(null);
    const [isServerWaking, setIsServerWaking] = useState(false);
    const [aiSummaryEnabled, setAiSummaryEnabled] = useState(false);

    const typingTimeoutRef = useRef(null);
    const captionTimeoutRef = useRef(null);

    // Keep active callbacks in ref to eliminate stale React closures
    const callbacksRef = useRef({});
    callbacksRef.current = {
        onSignalReceived,
        onUserJoined,
        onUserLeft,
        onForceMute,
        onForceVideoOff,
        onMeetingEndedByHost,
        onUserRemoved,
        onRoomFull
    };

    const isHost = Boolean(socketId && hostSocketId && socketId === hostSocketId);

    // Send WebRTC signal over Socket.IO
    const sendSignal = useCallback((toId, signalData) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('signal', toId, signalData);
        }
    }, []);

    // Connect to Socket server and join room
    const connect = useCallback((displayName) => {
        if (socketRef.current) return;

        setIsServerWaking(false);
        const wakingTimer = setTimeout(() => {
            if (!socketRef.current?.connected) {
                setIsServerWaking(true);
            }
        }, 3500);

        const token = userData?.token || localStorage.getItem('token') || '';
        const avatar = userData?.avatar || null;
        const isSecure = server.startsWith("https");
        const socket = io.connect(server, {
            secure: isSecure,
            withCredentials: true,
            transports: ['websocket', 'polling'],
            upgrade: true,
            reconnectionAttempts: 15,
            reconnectionDelay: 1000,
            timeout: 10000
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            clearTimeout(wakingTimer);
            setIsServerWaking(false);
            socketIdRef.current = socket.id;
            setSocketId(socket.id);
            socket.emit('join-call', roomUrl, displayName, token, avatar);
        });

        socket.on('connect_error', () => {
            setIsServerWaking(true);
        });

        // User joined room (with host designation, lock status, permissions, and private mode)
        socket.on('user-joined', (id, clients, namesMap, avatarsMap, roomHost, locked, permissions, isPrivate) => {
            if (id !== socket.id) playChime('join');
            if (roomHost) setHostSocketId(roomHost);
            if (locked !== undefined) setIsRoomLocked(Boolean(locked));
            if (permissions) setRoomPermissions(permissions);
            if (isPrivate !== undefined) setIsPrivateCall(Boolean(isPrivate));
            callbacksRef.current.onUserJoined?.(id, clients, namesMap, avatarsMap, roomHost, socket.id, isPrivate);
        });

        // WebRTC Signaling relay
        socket.on('signal', (fromId, data) => {
            let parsedData = data;
            if (typeof data === 'string') {
                try { parsedData = JSON.parse(data); } catch (e) {}
            }
            callbacksRef.current.onSignalReceived?.(fromId, parsedData);
        });

        // User left room
        socket.on('user-left', (leftId) => {
            playChime('leave');
            setRaisedHands(prev => {
                const next = { ...prev };
                delete next[leftId];
                return next;
            });
            callbacksRef.current.onUserLeft?.(leftId);
        });

        // Chat messages
        socket.on('chat-message', (data, sender, senderSocketId) => {
            if (senderSocketId !== socket.id) playChime('message');
            setMessages(prev => [...prev, { sender, data, socketId: senderSocketId, time: new Date() }]);
            setNewMessagesCount(prev => prev + 1);
        });

        // Typing indicators
        socket.on('user-typing', ({ username }) => {
            setTypingUser(username);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
        });

        socket.on('user-stop-typing', () => setTypingUser(null));

        // Emoji reactions
        socket.on('reaction', (emoji, sender, senderId) => {
            playChime('pop');
            const newReaction = { id: Date.now() + Math.random(), emoji, sender, senderId };
            setReactions(prev => [...prev, newReaction]);
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== newReaction.id));
            }, 3500);
        });

        // Hand raises
        socket.on('raise-hand', (isRaised, sender, senderId, hostId) => {
            if (isRaised && socket.id === hostId) playChime('hand');
            setRaisedHands(prev => ({ ...prev, [senderId]: isRaised ? { sender, time: Date.now() } : null }));
        });

        // Waiting room & Host controls
        socket.on('waiting-for-admission', () => setIsWaitingForAdmission(true));
        socket.on('admission-granted', () => {
            setIsWaitingForAdmission(false);
            socket.emit('join-call', roomUrl, displayName, token, avatar, true);
        });
        socket.on('admission-denied', () => {
            setIsWaitingForAdmission(false);
            setAdmissionDenied(true);
        });
        socket.on('waiting-users-list', (list) => setWaitingUsers(list || []));
        socket.on('user-waiting', () => {
            if (socket.id === hostSocketId) playChime('join');
        });

        // Moderation
        socket.on('room-lock-changed', ({ isLocked }) => setIsRoomLocked(Boolean(isLocked)));
        socket.on('force-mute', () => callbacksRef.current.onForceMute?.());
        socket.on('user-removed', ({ message }) => callbacksRef.current.onUserRemoved?.(message));
        socket.on('spotlight-changed', ({ spotlightId }) => setSpotlightUser(spotlightId));
        socket.on('host-changed', ({ hostSocketId }) => {
            setHostSocketId(hostSocketId);
            playChime('hand');
        });

        // Step 3: Single presenter coordination
        socket.on('screen-presenter-changed', ({ presenterId, presenterName }) => {
            setActivePresenter(presenterId ? { presenterId, presenterName } : null);
        });

        // Step 9: AI Summary status broadcast
        socket.on('ai-summary-status-changed', ({ enabled }) => {
            setAiSummaryEnabled(Boolean(enabled));
        });

        // Room full (capacity limit reached)
        socket.on('room-full', (info) => callbacksRef.current.onRoomFull?.(info));

        // Recording status
        socket.on('recording-status', ({ isRecording, host }) => {
            setRemoteRecording({ isRecording, host: host || 'Host' });
        });

        // Live captions from other participants
        socket.on('remote-caption', (data) => {
            setRemoteCaption(data);
            if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
            captionTimeoutRef.current = setTimeout(() => {
                setRemoteCaption(null);
            }, 4000);
        });

        // Meeting ended for all by host
        socket.on('meeting-ended-by-host', (data) => {
            callbacksRef.current.onMeetingEndedByHost?.(data);
        });

        // Meeting permissions changed by host
        socket.on('permissions-changed', (perms) => {
            if (perms) setRoomPermissions(perms);
        });

        // Forced video stop by host
        socket.on('force-video-off', (data) => {
            callbacksRef.current.onForceVideoOff?.(data);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomUrl, userData, hostSocketId]);

    // Host actions
    const lockRoom = useCallback((lock) => {
        if (isHost) socketRef.current?.emit('lock-room', lock);
    }, [isHost]);

    const endMeetingForAll = useCallback(() => {
        if (isHost) socketRef.current?.emit('end-meeting-for-all');
    }, [isHost]);

    const toggleScreenSharePermission = useCallback((allow) => {
        if (isHost) socketRef.current?.emit('toggle-screen-share-permission', allow);
    }, [isHost]);

    const toggleChatPermission = useCallback((allow) => {
        if (isHost) socketRef.current?.emit('toggle-chat-permission', allow);
    }, [isHost]);

    const forceStopVideo = useCallback((targetId) => {
        if (isHost) socketRef.current?.emit('force-stop-video', targetId);
    }, [isHost]);

    const admitUser = useCallback((targetId) => {
        if (isHost) socketRef.current?.emit('admit-user', targetId);
    }, [isHost]);

    const denyUser = useCallback((targetId) => {
        if (isHost) socketRef.current?.emit('deny-user', targetId);
    }, [isHost]);

    const muteParticipant = useCallback((targetId) => {
        if (isHost) socketRef.current?.emit('mute-participant', targetId);
    }, [isHost]);

    const muteAll = useCallback(() => {
        if (isHost) socketRef.current?.emit('mute-all');
    }, [isHost]);

    const removeParticipant = useCallback((targetId) => {
        if (isHost) socketRef.current?.emit('remove-participant', targetId);
    }, [isHost]);

    const spotlightParticipant = useCallback((targetId) => {
        if (isHost) socketRef.current?.emit('spotlight-participant', targetId);
    }, [isHost]);

    // User interactions
    const sendMessage = useCallback((content, senderName) => {
        socketRef.current?.emit('chat-message', content, senderName);
        socketRef.current?.emit('stop-typing');
    }, []);

    const sendTyping = useCallback(() => {
        socketRef.current?.emit('typing');
    }, []);

    const sendStopTyping = useCallback(() => {
        socketRef.current?.emit('stop-typing');
    }, []);

    const sendReaction = useCallback((emoji, senderName) => {
        socketRef.current?.emit('reaction', emoji, senderName);
    }, []);

    const toggleRaiseHand = useCallback((senderName) => {
        const nextState = !isHandRaised;
        setIsHandRaised(nextState);
        socketRef.current?.emit('raise-hand', nextState, senderName);
    }, [isHandRaised]);

    const notifyRecordingStarted = useCallback((hostName) => {
        socketRef.current?.emit('recording-started', hostName);
    }, []);

    const notifyRecordingStopped = useCallback(() => {
        socketRef.current?.emit('recording-stopped');
    }, []);

    const sendCaption = useCallback((transcript, speaker) => {
        socketRef.current?.emit('live-caption', transcript, speaker);
    }, []);

    // Step 3: Single presenter coordination requests
    const requestStartScreenShare = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (!socketRef.current?.connected) {
                return reject(new Error("Signaling connection unavailable"));
            }

            let timeoutId;
            const handleApproved = () => {
                cleanup();
                resolve(true);
            };

            const handleRejected = ({ message }) => {
                cleanup();
                reject(new Error(message || "Screen sharing request was rejected."));
            };

            const cleanup = () => {
                clearTimeout(timeoutId);
                socketRef.current?.off('screen-share-approved', handleApproved);
                socketRef.current?.off('screen-share-rejected', handleRejected);
            };

            socketRef.current.once('screen-share-approved', handleApproved);
            socketRef.current.once('screen-share-rejected', handleRejected);
            socketRef.current.emit('start-screen-share');

            // Fallback timeout to prevent UI hang
            timeoutId = setTimeout(() => {
                cleanup();
                resolve(true);
            }, 4000);
        });
    }, []);

    const stopScreenShareSignal = useCallback(() => {
        socketRef.current?.emit('stop-screen-share');
    }, []);

    // Step 9: Host toggle AI summary
    const toggleAiSummary = useCallback((enable) => {
        socketRef.current?.emit('toggle-ai-summary', Boolean(enable));
    }, []);

    // Step 8: Retry signaling connection on cold-start
    const retryConnection = useCallback((displayName) => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setIsServerWaking(true);
        // Wake server container via HTTP health check
        fetch(`${server}/health`).catch(() => {});
        setTimeout(() => {
            connect(displayName);
        }, 800);
    }, [connect]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => disconnect();
    }, [disconnect]);

    return {
        socketRef,
        socketIdRef,
        socketId,
        hostSocketId,
        isHost,
        isRoomLocked,
        roomPermissions,
        isPrivateCall,
        messages,
        newMessagesCount,
        typingUser,
        raisedHands,
        isHandRaised,
        reactions,
        waitingUsers,
        isWaitingForAdmission,
        admissionDenied,
        spotlightUser,
        remoteRecording,
        remoteCaption,
        activePresenter,
        isServerWaking,
        aiSummaryEnabled,
        sendCaption,
        requestStartScreenShare,
        stopScreenShareSignal,
        toggleAiSummary,
        retryConnection,
        connect,
        sendSignal,
        sendMessage,
        sendTyping,
        sendStopTyping,
        sendReaction,
        toggleRaiseHand,
        lockRoom,
        endMeetingForAll,
        toggleScreenSharePermission,
        toggleChatPermission,
        forceStopVideo,
        admitUser,
        denyUser,
        muteParticipant,
        muteAll,
        removeParticipant,
        spotlightParticipant,
        notifyRecordingStarted,
        notifyRecordingStopped,
        setNewMessagesCount,
        disconnect
    };
}
