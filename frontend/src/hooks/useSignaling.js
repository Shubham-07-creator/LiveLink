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
    onUserRemoved,
    onRoomFull
} = {}) {
    const socketRef = useRef(null);
    const socketIdRef = useRef('');
    const [socketId, setSocketId] = useState('');
    const [hostSocketId, setHostSocketId] = useState('');
    const [isRoomLocked, setIsRoomLocked] = useState(false);
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

    const typingTimeoutRef = useRef(null);

    // Keep active callbacks in ref to eliminate stale React closures
    const callbacksRef = useRef({});
    callbacksRef.current = {
        onSignalReceived,
        onUserJoined,
        onUserLeft,
        onForceMute,
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

        const token = userData?.token || localStorage.getItem('token') || '';
        const avatar = userData?.avatar || null;
        const isSecure = server.startsWith("https");
        const socket = io.connect(server, {
            secure: isSecure,
            withCredentials: true,
            transports: ['websocket', 'polling'],
            upgrade: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 500,
            timeout: 8000
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            socketIdRef.current = socket.id;
            setSocketId(socket.id);
            socket.emit('join-call', roomUrl, displayName, token, avatar);
        });

        // User joined room
        socket.on('user-joined', (id, clients, namesMap, avatarsMap, roomHost, locked) => {
            if (id !== socket.id) playChime('join');
            if (roomHost) setHostSocketId(roomHost);
            if (locked !== undefined) setIsRoomLocked(Boolean(locked));
            callbacksRef.current.onUserJoined?.(id, clients, namesMap, avatarsMap, roomHost, socket.id);
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

        // Room full (capacity limit reached)
        socket.on('room-full', (info) => callbacksRef.current.onRoomFull?.(info));

        // Recording status
        socket.on('recording-status', ({ isRecording, host }) => {
            setRemoteRecording({ isRecording, host: host || 'Host' });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomUrl, userData, hostSocketId]);

    // Host actions
    const lockRoom = useCallback((lock) => {
        if (isHost) socketRef.current?.emit('lock-room', lock);
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
        connect,
        sendSignal,
        sendMessage,
        sendTyping,
        sendStopTyping,
        sendReaction,
        toggleRaiseHand,
        lockRoom,
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
