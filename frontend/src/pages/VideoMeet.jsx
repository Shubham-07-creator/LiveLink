import React, { useEffect, useRef, useState, useContext, useCallback } from 'react';
import io from "socket.io-client";
import axios from 'axios';
import { 
    Badge, 
    IconButton, 
    TextField, 
    Box, 
    Typography, 
    Paper, 
    Tooltip, 
    Button, 
    Chip, 
    Snackbar, 
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tab,
    Tabs,
    List,
    Avatar,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Menu,
    useMediaQuery,
    AvatarGroup,
    CircularProgress,
    Rating
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

// Icons
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import SecurityIcon from '@mui/icons-material/Security';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopIcon from '@mui/icons-material/Stop';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PanToolIcon from '@mui/icons-material/PanTool';
import AddReactionIcon from '@mui/icons-material/AddReaction';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GroupsIcon from '@mui/icons-material/Groups';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PushPinIcon from '@mui/icons-material/PushPin';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import ClosedCaptionDisabledIcon from '@mui/icons-material/ClosedCaptionDisabled';
import SettingsIcon from '@mui/icons-material/Settings';
import ImageIcon from '@mui/icons-material/Image';
import BlurOnIcon from '@mui/icons-material/BlurOn';
import BlurOffIcon from '@mui/icons-material/BlurOff';

import server from '../environment';

const server_url = server;
var connections = {};

// Dynamic ICE & TURN Servers configuration from environment variables
const getIceServers = () => {
    const servers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
    ];
    if (process.env.REACT_APP_TURN_URL) {
        servers.push({
            urls: process.env.REACT_APP_TURN_URL,
            username: process.env.REACT_APP_TURN_USERNAME || "",
            credential: process.env.REACT_APP_TURN_CREDENTIAL || ""
        });
    }
    return servers;
};

const peerConfigConnections = {
    iceServers: getIceServers()
};

const nameOverlayStyle = {
    position: 'absolute', bottom: 12, left: 12, color: 'white', 
    backgroundColor: 'rgba(0,0,0,0.65)', px: 1.5, py: 0.5, borderRadius: 1.5, 
    fontWeight: 'bold', zIndex: 10, backdropFilter: 'blur(4px)', fontSize: '0.85rem'
};

let isSoundChimeActive = true;
let isReactionSoundActive = false; // Reaction sounds OFF by default per requirements

// Helpers for initials and distinct avatar colors
const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

const getAvatarColor = (name) => {
    const colors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#4f46e5"];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

// Web Audio API Pleasant Notification Chimes (Zero external MP3 dependencies)
const playChime = (type) => {
    if (type !== 'beep' && !isSoundChimeActive) return;
    if (type === 'pop' && !isReactionSoundActive) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        if (type === 'join') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.45);
        } else if (type === 'leave') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(659.25, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.45);
        } else if (type === 'message') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } else if (type === 'hand') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
            gain.gain.setValueAtTime(0.14, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.45);
        } else if (type === 'beep') {
            // Speaker test dual-tone beep
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
        }
    } catch (e) {
        // Safe fail for browser autoplay constraints
    }
};

export default function VideoMeetComponent() {
    const { url } = useParams();
    const navigate = useNavigate();
    const { userData } = useContext(AuthContext);

    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoref = useRef();
    const miniLocalVideoRef = useRef(); 
    const messageInputRef = useRef(null); 
    const chatFileInputRef = useRef(null);
    const videoRef = useRef([]);
    const roomNamesRef = useRef({});
    const statsIntervalRef = useRef(null);
    const dockTimerRef = useRef(null);

    const isMobile = useMediaQuery('(max-width:600px)');

    // Permissions & Media State
    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [video, setVideo] = useState(true); 
    const [audio, setAudio] = useState(true);
    const [screen, setScreen] = useState();
    const [screenAvailable, setScreenAvailable] = useState(false);
    const [isBackgroundBlur, setIsBackgroundBlur] = useState(false);

    // Device Enumeration
    const [videoDevices, setVideoDevices] = useState([]);
    const [audioInputDevices, setAudioInputDevices] = useState([]);
    const [audioOutputDevices, setAudioOutputDevices] = useState([]);
    const [selectedCamera, setSelectedCamera] = useState('');
    const [selectedMicrophone, setSelectedMicrophone] = useState('');
    const [selectedSpeaker, setSelectedSpeaker] = useState('');

    // Pre-Call Lobby state & Avatars
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");
    const [lobbyRoomParticipants, setLobbyRoomParticipants] = useState([]);

    // Live Mic Visualizer & Muted Speaking Hint
    const [audioVolume, setAudioVolume] = useState(0);
    const [showMutedSpeakingHint, setShowMutedSpeakingHint] = useState(false);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);

    // Call Reliability: Reconnecting Banner & Network Quality
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [reconnectFailed, setReconnectFailed] = useState(false);
    const reconnectTimerRef = useRef(null);
    const [duplicateTabDetected, setDuplicateTabDetected] = useState(false);
    const [deviceSettingsOpen, setDeviceSettingsOpen] = useState(false);
    const [networkStats, setNetworkStats] = useState({ quality: 'Good', rtt: 45, loss: '0.0' });
    const [activeSpeakers, setActiveSpeakers] = useState({});

    // Video Grid / Tiles State
    const [videos, setVideos] = useState([]);

    // Recording State (Local & Broadcasted)
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [remoteRecordingState, setRemoteRecordingState] = useState({ isRecording: false, host: '' });

    // Toast Notifications
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMsg, setToastMsg] = useState("");

    // Raise Hand & Reactions
    const [isHandRaised, setIsHandRaised] = useState(false);
    const [raisedHands, setRaisedHands] = useState({});
    const [reactions, setReactions] = useState([]);
    const [reactionMenuOpen, setReactionMenuOpen] = useState(false);
    const [hostSocketId, setHostSocketId] = useState('');

    // Host Controls & Waiting Room
    const [isRoomLocked, setIsRoomLocked] = useState(false);
    const [waitingUsers, setWaitingUsers] = useState([]);
    const [isWaitingForAdmission, setIsWaitingForAdmission] = useState(false);
    const [admissionDenied, setAdmissionDenied] = useState(false);
    const [removedByHost, setRemovedByHost] = useState(false);
    const callStartTimeRef = useRef(null);

    // Meeting View Modes & Pinning
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'speaker'
    const [pinnedUser, setPinnedUser] = useState(null); // socketId or 'local'
    const [spotlightUser, setSpotlightUser] = useState(null); // socketId
    const [isPipActive, setIsPipActive] = useState(false);

    // Chat Typing Indicator
    const [typingUser, setTypingUser] = useState(null);
    const typingTimeoutRef = useRef(null);

    // Live Captions (Web Speech API)
    const [captionsActive, setCaptionsActive] = useState(false);
    const [liveCaptions, setLiveCaptions] = useState([]);
    const recognitionRef = useRef(null);

    // Post-Call Feedback Modal
    const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [feedbackRating, setFeedbackRating] = useState(5);
    const [feedbackComment, setFeedbackComment] = useState("");
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

    // Control Dock Visibility & Mobile More Menu
    const [isDockVisible, setIsDockVisible] = useState(true);
    const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);

    // Modals & Panels
    const [showModal, setModal] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessages, setNewMessages] = useState(0);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [meetingInfoOpen, setMeetingInfoOpen] = useState(false);
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [drawerTab, setDrawerTab] = useState(0); 
    const [roomFullDialogOpen, setRoomFullDialogOpen] = useState(false);

    const isHost = Boolean(socketIdRef.current && hostSocketId && socketIdRef.current === hostSocketId);

    // Load available cameras, mics, and speakers
    const loadDevices = useCallback(async () => {
        try {
            if (!navigator.mediaDevices?.enumerateDevices) return;
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cams = devices.filter(d => d.kind === 'videoinput');
            const mics = devices.filter(d => d.kind === 'audioinput');
            const spks = devices.filter(d => d.kind === 'audiooutput');

            setVideoDevices(cams);
            setAudioInputDevices(mics);
            setAudioOutputDevices(spks);

            if (cams.length && !selectedCamera) setSelectedCamera(cams[0].deviceId);
            if (mics.length && !selectedMicrophone) setSelectedMicrophone(mics[0].deviceId);
            if (spks.length && !selectedSpeaker) setSelectedSpeaker(spks[0].deviceId);
        } catch (e) {
            console.warn("Could not enumerate media devices:", e);
        }
    }, [selectedCamera, selectedMicrophone, selectedSpeaker]);

    // Check device permissions and initialize preview stream
    const getPermissions = useCallback(async () => {
        const audioConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
                audio: selectedMicrophone 
                    ? { deviceId: { exact: selectedMicrophone }, ...audioConstraints } 
                    : audioConstraints
            });

            window.localStream = stream;
            setVideoAvailable(true);
            setAudioAvailable(true);
            setPermissionDenied(false);

            if (localVideoref.current) {
                localVideoref.current.srcObject = stream;
            }
            startAudioVisualizer(stream);
            await loadDevices();
        } catch (err) {
            console.warn("Could not get media with initial constraints, attempting fallback:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionDenied(true);
                setVideoAvailable(false);
                setAudioAvailable(false);
            } else {
                try {
                    const vid = await navigator.mediaDevices.getUserMedia({ video: true });
                    window.localStream = vid;
                    setVideoAvailable(true);
                    if (localVideoref.current) localVideoref.current.srcObject = vid;
                } catch (e) {
                    setVideoAvailable(false);
                }
                try {
                    const aud = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
                    setAudioAvailable(true);
                    startAudioVisualizer(aud);
                } catch (e) {
                    setAudioAvailable(false);
                }
            }
            await loadDevices();
        }
        setScreenAvailable(Boolean(navigator.mediaDevices?.getDisplayMedia));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCamera, selectedMicrophone, loadDevices]);

    // Handle devicechange event
    useEffect(() => {
        getPermissions();

        const handleDeviceChange = () => {
            loadDevices();
        };

        if (navigator.mediaDevices?.addEventListener) {
            navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
        }

        return () => {
            if (navigator.mediaDevices?.removeEventListener) {
                navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
            }
            stopAudioVisualizer();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch dynamic ICE / TURN servers configuration from backend endpoint
    useEffect(() => {
        axios.get(`${server_url}/api/v1/users/ice_servers`, { withCredentials: true })
            .then(res => {
                if (res.data?.iceServers?.length) {
                    peerConfigConnections.iceServers = res.data.iceServers;
                }
            })
            .catch(err => {
                console.warn("Could not fetch remote ICE servers, falling back to defaults:", err);
            });
    }, []);

    // Query room participants for Lobby Preview
    useEffect(() => {
        if (!askForUsername) return;
        const previewSocket = io.connect(server_url, { secure: false });
        previewSocket.emit("get-room-info", window.location.href);

        previewSocket.on("room-info", (data) => {
            if (data && Array.isArray(data.participants)) {
                setLobbyRoomParticipants(data.participants);
            }
        });

        return () => {
            try { previewSocket.disconnect(); } catch (e) {}
        };
    }, [askForUsername]);

    // Load saved preferences & display name
    useEffect(() => {
        const defaultName = userData?.name || userData?.username || "";
        setUsername(defaultName);

        const prefMic = localStorage.getItem("livelink_pref_mic_muted") === "true";
        const prefCam = localStorage.getItem("livelink_pref_cam_off") === "true";
        const prefChimes = localStorage.getItem("livelink_pref_chimes") !== "false";

        if (prefMic) setAudio(false);
        if (prefCam) setVideo(false);
        setSoundEnabled(prefChimes);
        isSoundChimeActive = prefChimes;
    }, [userData]);

    // Audio Visualizer & Speaking / Muted Detection
    const startAudioVisualizer = (stream) => {
        try {
            stopAudioVisualizer();
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const audioCtx = new AudioCtx();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            audioContextRef.current = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkVolume = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                const volumeLevel = Math.min(100, Math.round(average * 2.2));
                setAudioVolume(volumeLevel);

                // Speaking detection on local user
                if (window.localStream && window.localStream.getAudioTracks()[0]?.enabled) {
                    setActiveSpeakers(prev => ({ ...prev, local: volumeLevel > 16 }));
                } else {
                    setActiveSpeakers(prev => ({ ...prev, local: false }));
                    // "You are muted" hint when user speaks while muted
                    if (average > 18) {
                        setShowMutedSpeakingHint(true);
                    }
                }

                animFrameRef.current = requestAnimationFrame(checkVolume);
            };
            checkVolume();
        } catch (e) {
            console.warn("Audio visualizer error:", e);
        }
    };

    const stopAudioVisualizer = () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (audioContextRef.current) {
            try { audioContextRef.current.close(); } catch (e) {}
            audioContextRef.current = null;
        }
        setAudioVolume(0);
    };

    // Auto-dismiss "You are muted" hint after 3 seconds
    useEffect(() => {
        if (showMutedSpeakingHint) {
            const timer = setTimeout(() => setShowMutedSpeakingHint(false), 3500);
            return () => clearTimeout(timer);
        }
    }, [showMutedSpeakingHint]);

    // Reconnection 45s failure timeout
    useEffect(() => {
        if (isReconnecting) {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(() => {
                setReconnectFailed(true);
            }, 45000);
        } else {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            setReconnectFailed(false);
        }
        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        };
    }, [isReconnecting]);

    // Duplicate Tab Warning via BroadcastChannel
    useEffect(() => {
        if (typeof window === 'undefined' || !window.BroadcastChannel) return;
        try {
            const channelName = `livelink_active_room_${url || 'call'}`;
            const channel = new BroadcastChannel(channelName);

            channel.onmessage = (event) => {
                if (event.data === 'ping') {
                    channel.postMessage('pong');
                } else if (event.data === 'pong') {
                    setDuplicateTabDetected(true);
                }
            };

            channel.postMessage('ping');

            return () => {
                try { channel.close(); } catch (e) {}
            };
        } catch (e) {
            console.warn("BroadcastChannel error:", e);
        }
    }, [url]);

    // Timer for recording
    useEffect(() => {
        let interval = null;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingSeconds(sec => sec + 1);
            }, 1000);
        } else {
            setRecordingSeconds(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    // Fullscreen listener
    useEffect(() => {
        const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, []);

    // Control Dock Inactivity Auto-Hide (3 Seconds)
    useEffect(() => {
        const resetDockTimer = () => {
            setIsDockVisible(true);
            if (dockTimerRef.current) clearTimeout(dockTimerRef.current);
            dockTimerRef.current = setTimeout(() => {
                if (!askForUsername && !showModal && !leaveModalOpen && !reactionMenuOpen && !moreMenuAnchor) {
                    setIsDockVisible(false);
                }
            }, 3000);
        };

        window.addEventListener('mousemove', resetDockTimer);
        window.addEventListener('touchstart', resetDockTimer);
        window.addEventListener('keydown', resetDockTimer);

        return () => {
            window.removeEventListener('mousemove', resetDockTimer);
            window.removeEventListener('touchstart', resetDockTimer);
            window.removeEventListener('keydown', resetDockTimer);
            if (dockTimerRef.current) clearTimeout(dockTimerRef.current);
        };
    }, [askForUsername, showModal, leaveModalOpen, reactionMenuOpen, moreMenuAnchor]);

    // Keyboard Shortcuts: M (mute), V (video), H (raise hand), C (chat), Esc (close modals)
    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = document.activeElement?.tagName?.toLowerCase();
            if (tag === 'input' || tag === 'textarea') {
                if (e.key === 'Escape') document.activeElement.blur();
                return;
            }

            if (e.key === 'Escape') {
                setModal(false);
                setLeaveModalOpen(false);
                setMeetingInfoOpen(false);
                setReactionMenuOpen(false);
                setMoreMenuAnchor(null);
            } else if (e.key === 'm' || e.key === 'M') {
                handleAudio();
            } else if (e.key === 'v' || e.key === 'V') {
                handleVideo();
            } else if (e.key === 'h' || e.key === 'H') {
                handleToggleRaiseHand();
            } else if (e.key === 'c' || e.key === 'C') {
                setModal(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audio, video, isHandRaised, showModal]);

    // Network Quality & Audio Level Polling from RTCPeerConnection.getStats()
    useEffect(() => {
        if (askForUsername) return;

        statsIntervalRef.current = setInterval(async () => {
            let totalRtt = 0;
            let rttCount = 0;
            let totalPacketsLost = 0;
            let totalPackets = 0;
            let remoteSpeakingMap = {};

            for (let id in connections) {
                const pc = connections[id];
                if (pc && (pc.connectionState === 'connected' || pc.iceConnectionState === 'connected')) {
                    try {
                        const stats = await pc.getStats();
                        for (const report of stats.values()) {
                            if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime) {
                                totalRtt += report.currentRoundTripTime * 1000;
                                rttCount++;
                            }
                            if (report.type === 'inbound-rtp') {
                                if (typeof report.packetsLost === 'number') totalPacketsLost += report.packetsLost;
                                if (typeof report.packetsReceived === 'number') totalPackets += report.packetsReceived;
                                if (report.kind === 'audio' && typeof report.audioLevel === 'number') {
                                    if (report.audioLevel > 0.04) {
                                        remoteSpeakingMap[id] = true;
                                    }
                                }
                            }
                        }
                    } catch (e) {}
                }
            }

            if (rttCount > 0) {
                const avgRtt = Math.round(totalRtt / rttCount);
                const lossRate = totalPackets > 0 ? ((totalPacketsLost / (totalPackets + totalPacketsLost)) * 100).toFixed(1) : '0.0';

                let quality = 'Good';
                if (avgRtt > 300 || parseFloat(lossRate) > 8) {
                    quality = 'Poor';
                } else if (avgRtt > 150 || parseFloat(lossRate) > 3) {
                    quality = 'Weak';
                }

                setNetworkStats({ quality, rtt: avgRtt, loss: lossRate });
            }

            // Sync speaking highlight for peers
            setActiveSpeakers(prev => ({
                local: prev.local,
                ...remoteSpeakingMap
            }));
        }, 2200);

        return () => {
            if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
        };
    }, [askForUsername]);

    // Sync active local video elements when entering meeting
    useEffect(() => {
        if (!askForUsername && window.localStream) {
            if (video) {
                if (localVideoref.current) localVideoref.current.srcObject = window.localStream;
                if (miniLocalVideoRef.current) miniLocalVideoRef.current.srcObject = window.localStream;
            } else {
                if (localVideoref.current) localVideoref.current.srcObject = null;
                if (miniLocalVideoRef.current) miniLocalVideoRef.current.srcObject = null;
            }
        }
    }, [viewMode, pinnedUser, askForUsername, videos, video]);

    const silence = () => {
        let ctx = new AudioContext();
        let oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    };

    const black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height });
        canvas.getContext('2d').fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    };

    // Toggle Camera
    const handleVideo = () => {
        if (window.localStream) {
            let videoTrack = window.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideo(videoTrack.enabled);
                if (socketRef.current) {
                    socketRef.current.emit('video-toggle', videoTrack.enabled);
                }
            }
        }
    };

    // Toggle Microphone
    const handleAudio = () => {
        if (window.localStream) {
            let audioTrack = window.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setAudio(audioTrack.enabled);
                if (audioTrack.enabled) {
                    setShowMutedSpeakingHint(false);
                }
            }
        }
    };

    // Test Speaker Beep
    const handleTestSpeaker = () => {
        playChime('beep');
        setToastMsg("🔊 Speaker test: beep sound played");
        setToastOpen(true);
    };

    // Switch Hardware Devices in Live Stream
    const switchCamera = async (deviceId) => {
        setSelectedCamera(deviceId);
        if (!window.localStream) return;
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: deviceId } },
                audio: false
            });
            const newTrack = newStream.getVideoTracks()[0];
            const oldTrack = window.localStream.getVideoTracks()[0];
            if (oldTrack) {
                oldTrack.stop();
                window.localStream.removeTrack(oldTrack);
            }
            window.localStream.addTrack(newTrack);
            if (localVideoref.current) localVideoref.current.srcObject = window.localStream;
            for (let id in connections) {
                const sender = connections[id].getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) sender.replaceTrack(newTrack);
            }
        } catch (e) {
            console.warn("Could not switch camera:", e);
        }
    };

    const switchMicrophone = async (deviceId) => {
        setSelectedMicrophone(deviceId);
        if (!window.localStream) return;
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: false
            });
            const newTrack = newStream.getAudioTracks()[0];
            const oldTrack = window.localStream.getAudioTracks()[0];
            if (oldTrack) {
                oldTrack.stop();
                window.localStream.removeTrack(oldTrack);
            }
            window.localStream.addTrack(newTrack);
            startAudioVisualizer(window.localStream);
            for (let id in connections) {
                const sender = connections[id].getSenders().find(s => s.track && s.track.kind === 'audio');
                if (sender) sender.replaceTrack(newTrack);
            }
        } catch (e) {
            console.warn("Could not switch microphone:", e);
        }
    };

    const switchSpeaker = async (deviceId) => {
        setSelectedSpeaker(deviceId);
        try {
            if (typeof HTMLMediaElement.prototype.setSinkId === 'function') {
                const mediaElements = document.querySelectorAll('audio, video');
                for (let el of mediaElements) {
                    await el.setSinkId(deviceId);
                }
            }
        } catch (e) {
            console.warn("Could not switch audio output device:", e);
        }
    };

    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    // Join without Camera/Mic (Fallback when permissions are denied)
    const joinWithoutMedia = () => {
        let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
        window.localStream = blackSilence();
        setVideo(false);
        setAudio(false);
        setVideoAvailable(false);
        setAudioAvailable(false);
        connect();
    };

    // Background Blur (Soft focus depth-of-field)
    const handleToggleBlur = () => {
        const nextState = !isBackgroundBlur;
        setIsBackgroundBlur(nextState);
        setToastMsg(nextState ? "Background blur effect enabled" : "Background blur effect disabled");
        setToastOpen(true);
    };

    // Emergency Privacy Shield
    const handlePrivacyShield = () => {
        if (window.localStream) {
            let videoTrack = window.localStream.getVideoTracks()[0];
            let audioTrack = window.localStream.getAudioTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = false;
                setVideo(false);
                if (socketRef.current) socketRef.current.emit('video-toggle', false);
            }
            if (audioTrack) {
                audioTrack.enabled = false;
                setAudio(false);
            }
            setToastMsg("🛡️ Privacy Shield Active: Camera & Mic turned off!");
            setToastOpen(true);
        }
    };

    // Meeting Recording with broadcast notice to all participants
    const handleToggleRecording = () => {
        if (isRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
            if (socketRef.current) socketRef.current.emit('recording-stopped');
            setToastMsg("💾 Recording saved & downloaded to your device!");
            setToastOpen(true);
        } else {
            try {
                if (!window.localStream) {
                    setToastMsg("Media stream not available for recording.");
                    setToastOpen(true);
                    return;
                }

                recordedChunksRef.current = [];
                const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                    ? 'video/webm;codecs=vp9'
                    : 'video/webm';

                const recorder = new MediaRecorder(window.localStream, { mimeType });

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        recordedChunksRef.current.push(e.data);
                    }
                };

                recorder.onstop = () => {
                    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `LiveLink-Recording-${Date.now()}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                    }, 100);
                };

                recorder.start(1000);
                mediaRecorderRef.current = recorder;
                setIsRecording(true);
                if (socketRef.current) socketRef.current.emit('recording-started', username || "Host");
                setToastMsg("🔴 Recording started! Click again to stop & save.");
                setToastOpen(true);
            } catch (err) {
                console.error("Recording error:", err);
                setToastMsg("Unable to record: " + err.message);
                setToastOpen(true);
            }
        }
    };

    // Live Reactions Trigger
    const triggerReaction = (emoji, sender) => {
        playChime('pop');
        const id = `${Date.now()}-${Math.random()}`;
        const left = 25 + Math.random() * 50;
        setReactions(prev => [...prev, { id, emoji, sender, left }]);
        setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== id));
        }, 2600);
    };

    const handleSendReaction = (emoji) => {
        if (socketRef.current) {
            socketRef.current.emit('reaction', emoji, username || "You");
        }
        triggerReaction(emoji, username || "You");
        setReactionMenuOpen(false);
    };

    // Toggle Raise Hand
    const handleToggleRaiseHand = () => {
        const nextState = !isHandRaised;
        setIsHandRaised(nextState);
        if (socketRef.current) {
            socketRef.current.emit('raise-hand', nextState, username || "You");
        }
        setRaisedHands(prev => ({
            ...prev,
            [socketIdRef.current]: { sender: username || "You", isRaised: nextState }
        }));
        if (nextState) {
            playChime('hand');
            setToastMsg("✋ You raised your hand");
        } else {
            setToastMsg("Hand lowered");
        }
        setToastOpen(true);
    };

    // Screen sharing
    const getDislayMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop());
        } catch (e) { }

        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;

        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            connections[id].addStream(window.localStream);
            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                    })
                    .catch(e => console.log(e));
            });
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false);
            try {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            } catch (e) { }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            if (localVideoref.current) localVideoref.current.srcObject = window.localStream;
            getUserMedia();
        });
    };

    const getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .catch((e) => console.log(e));
            }
        }
    };

    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screen]);

    const handleScreen = () => setScreen(!screen);

    const getUserMedia = () => {
        if (window.localStream) {
            let videoTrack = window.localStream.getVideoTracks()[0];
            if (videoTrack) videoTrack.enabled = video;
            let audioTrack = window.localStream.getAudioTracks()[0];
            if (audioTrack) audioTrack.enabled = audio;
        }
    };

    // WebRTC Signaling Handlers
    const gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message);
        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }));
                            }).catch(e => console.log(e));
                        }).catch(e => console.log(e));
                    }
                }).catch(e => console.log(e));
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
            }
        }
    };

    const addMessage = (data, sender, socketIdSender) => {
        if (socketIdSender !== socketIdRef.current) {
            playChime('message');
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
        const safeSender = String(sender || "User").replace(/[<>]/g, "");
        const safeData = String(data || "");
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: safeSender, data: safeData }
        ]);
    };

    const sendMessage = () => {
        const currentMsg = messageInputRef.current ? messageInputRef.current.value : "";
        if (!currentMsg || currentMsg.trim() === "") return; 
        socketRef.current.emit('chat-message', currentMsg, username);
        if (messageInputRef.current) messageInputRef.current.value = "";
    };

    // Trigger ICE Restart for a Peer
    const triggerIceRestart = (id) => {
        if (connections[id]) {
            console.log(`Triggering ICE restart for ${id}`);
            if (typeof connections[id].restartIce === 'function') {
                connections[id].restartIce();
            }
            connections[id].createOffer({ iceRestart: true })
                .then((desc) => {
                    connections[id].setLocalDescription(desc).then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ sdp: connections[id].localDescription }));
                    });
                })
                .catch(e => console.warn("ICE restart offer failed:", e));
        }
    };

    // Socket Connection Setup
    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });
        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            setIsReconnecting(false);
            const token = localStorage.getItem('token');
            const avatarUrl = userData?.avatar || null;
            socketRef.current.emit('join-call', window.location.href, username, token, avatarUrl);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on('room-full', () => {
                setRoomFullDialogOpen(true);
                cleanUpSession();
            });

            socketRef.current.on('join-error', (data) => {
                const errMsg = (data && data.message) || "Unable to join room. Please check the meeting link.";
                setToastMsg(errMsg);
                setToastOpen(true);
                cleanUpSession();
                setTimeout(() => {
                    navigate('/home');
                }, 2000);
            });

            socketRef.current.on('room-lock-changed', ({ isLocked }) => {
                setIsRoomLocked(Boolean(isLocked));
                setToastMsg(isLocked ? "🔒 Host locked the room. Waiting room is now active." : "🔓 Host unlocked the room.");
                setToastOpen(true);
            });

            socketRef.current.on('host-changed', (arg1, arg2) => {
                let newHostId, hostName;
                if (typeof arg1 === 'object' && arg1 !== null) {
                    newHostId = arg1.hostSocketId;
                    hostName = arg1.hostName;
                } else {
                    newHostId = arg1;
                    hostName = arg2;
                }
                setHostSocketId(newHostId);
                playChime('join');
                setToastMsg(`👑 ${hostName || 'A participant'} is now the host.`);
                setToastOpen(true);
            });

            socketRef.current.on('waiting-for-admission', () => {
                setIsWaitingForAdmission(true);
            });

            socketRef.current.on('waiting-users-list', (users) => {
                setWaitingUsers(users || []);
            });

            socketRef.current.on('user-waiting', (user) => {
                setWaitingUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
                setToastMsg(`🚪 ${user.username} is waiting to join.`);
                setToastOpen(true);
            });

            socketRef.current.on('admission-granted', () => {
                setIsWaitingForAdmission(false);
                setToastMsg("✅ Host admitted you to the meeting!");
                setToastOpen(true);
            });

            socketRef.current.on('admission-denied', () => {
                setAdmissionDenied(true);
                cleanUpSession();
            });

            socketRef.current.on('spotlight-changed', ({ spotlightId, spotlightName }) => {
                setSpotlightUser(spotlightId);
                if (spotlightId) {
                    setToastMsg(`🌟 ${spotlightName || 'A participant'} is spotlighted for everyone.`);
                } else {
                    setToastMsg("Spotlight removed.");
                }
                setToastOpen(true);
            });

            socketRef.current.on('force-mute', () => {
                if (window.localStream) {
                    const track = window.localStream.getAudioTracks()[0];
                    if (track) track.enabled = false;
                }
                setAudio(false);
                setToastMsg("🔇 The host muted your microphone.");
                setToastOpen(true);
            });

            socketRef.current.on('all-muted', () => {
                if (socketRef.current && socketRef.current.id !== hostSocketId) {
                    if (window.localStream) {
                        const track = window.localStream.getAudioTracks()[0];
                        if (track) track.enabled = false;
                    }
                    setAudio(false);
                    setToastMsg("🔇 The host muted all participants.");
                    setToastOpen(true);
                }
            });

            socketRef.current.on('participant-muted', ({ id: mutedId, name: mutedName }) => {
                setToastMsg(`🔇 ${mutedName || 'A participant'} was muted by the host.`);
                setToastOpen(true);
            });

            socketRef.current.on('user-removed', () => {
                setRemovedByHost(true);
                cleanUpSession();
            });

            socketRef.current.on('user-typing', (sender) => {
                setTypingUser(sender);
            });

            socketRef.current.on('user-stop-typing', () => {
                setTypingUser(null);
            });

            socketRef.current.on('caption', ({ sender, text }) => {
                setLiveCaptions(prev => [...prev.slice(-3), { sender, text, id: Date.now() + Math.random() }]);
            });

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('reaction', (emoji, sender, senderSocketId) => {
                if (senderSocketId !== socketIdRef.current) {
                    triggerReaction(emoji, sender);
                }
            });

            socketRef.current.on('raise-hand', (isRaised, sender, senderSocketId, roomHostId) => {
                setRaisedHands(prev => ({
                    ...prev,
                    [senderSocketId]: { sender, isRaised }
                }));
                if (senderSocketId !== socketIdRef.current) {
                    if (isRaised) {
                        // Play sound ONLY if current participant is the meeting host
                        if (socketIdRef.current === roomHostId) {
                            playChime('hand');
                        }
                        setToastMsg(`✋ ${sender} raised their hand!`);
                        setToastOpen(true);
                    }
                }
            });

            socketRef.current.on('recording-status', ({ isRecording: recActive, host }) => {
                setRemoteRecordingState({ isRecording: recActive, host: host || "Host" });
                if (recActive) {
                    setToastMsg(`🔴 Meeting is now being recorded by ${host || "Host"}`);
                } else {
                    setToastMsg("Meeting recording stopped.");
                }
                setToastOpen(true);
            });

            socketRef.current.on('video-status-changed', (senderId, isVideoEnabled) => {
                setVideos(prevVideos => 
                    prevVideos.map(vid => 
                        vid.socketId === senderId ? { ...vid, videoEnabled: isVideoEnabled } : vid
                    )
                );
            });

            socketRef.current.on('user-left', (id) => {
                playChime('leave');
                setVideos((videos) => videos.filter((video) => video.socketId !== id));
                videoRef.current = videoRef.current.filter((v) => v.socketId !== id);
                if (connections[id]) {
                    try { connections[id].close(); } catch (e) {}
                    delete connections[id];
                }
                setRaisedHands(prev => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
            });

            socketRef.current.on('user-joined', (id, clients, roomUserNamesMap, roomUserAvatarsMap, roomHost, isLocked) => {
                if (id !== socketIdRef.current) {
                    playChime('join');
                }

                if (roomHost) setHostSocketId(roomHost);
                if (isLocked !== undefined) setIsRoomLocked(Boolean(isLocked));
                if (roomUserNamesMap) roomNamesRef.current = roomUserNamesMap;

                clients.forEach((socketListId) => {
                    if (socketListId === socketIdRef.current) return;

                    if (!connections[socketListId]) {
                        connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                        connections[socketListId].onicecandidate = function (event) {
                            if (event.candidate != null) {
                                socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }));
                            }
                        };

                        connections[socketListId].oniceconnectionstatechange = () => {
                            const iceState = connections[socketListId]?.iceConnectionState;
                            if (iceState === 'failed' || iceState === 'disconnected') {
                                console.warn(`ICE state '${iceState}' for ${socketListId}, restarting ICE...`);
                                setIsReconnecting(true);
                                triggerIceRestart(socketListId);
                            } else if (iceState === 'connected') {
                                setIsReconnecting(false);
                            }
                        };

                        connections[socketListId].onaddstream = (event) => {
                            const videoTrack = event.stream.getVideoTracks()[0];
                            let initialVideoState = true;
                            if (videoTrack) initialVideoState = videoTrack.enabled;

                            let assignedName = (roomUserNamesMap && roomUserNamesMap[socketListId]) || "Participant";
                            let assignedAvatar = (roomUserAvatarsMap && roomUserAvatarsMap[socketListId]) || null;

                            setVideos(videos => {
                                const videoExists = videos.find(v => v.socketId === socketListId);
                                if (videoExists) {
                                    const updated = videos.map(v =>
                                        v.socketId === socketListId ? { ...v, stream: event.stream, name: assignedName, avatar: assignedAvatar } : v
                                    );
                                    videoRef.current = updated;
                                    return updated;
                                } else {
                                    const newVid = {
                                        socketId: socketListId,
                                        stream: event.stream,
                                        name: assignedName,
                                        avatar: assignedAvatar,
                                        autoplay: true,
                                        playsinline: true,
                                        videoEnabled: initialVideoState
                                    };
                                    const updated = [...videos, newVid];
                                    videoRef.current = updated;
                                    return updated;
                                }
                            });
                        };

                        if (window.localStream) {
                            connections[socketListId].addStream(window.localStream);
                        } else {
                            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                            window.localStream = blackSilence();
                            connections[socketListId].addStream(window.localStream);
                        }
                    }
                });

                if (clients.length >= 2) {
                    let lastJoined = clients[clients.length - 1];
                    if (lastJoined === socketIdRef.current) {
                        for (let id2 in connections) {
                            if (id2 === socketIdRef.current) continue;
                            try { connections[id2].addStream(window.localStream); } catch (e) {}

                            connections[id2].createOffer().then((description) => {
                                connections[id2].setLocalDescription(description)
                                    .then(() => {
                                        socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }));
                                    })
                                    .catch(e => console.log(e));
                            });
                        }
                    }
                }
            });
        });

        // Socket Disconnection: trigger reconnecting banner & auto rejoin
        socketRef.current.on('disconnect', () => {
            setIsReconnecting(true);
            console.warn("Socket disconnected. Attempting auto-reconnection...");
        });
    };

    // User clicks "Join Meeting Now" from Lobby
    const connect = () => {
        if (!username || !username.trim()) {
            setToastMsg("Please enter your display name to join.");
            setToastOpen(true);
            return;
        }
        stopAudioVisualizer();
        callStartTimeRef.current = Date.now();
        setAskForUsername(false);
        connectToSocketServer();
    };

    // Host Controls: Lock room, mute participant, mute all, remove participant, admit/deny waiting
    const handleLockRoom = () => {
        if (socketRef.current && isHost) {
            socketRef.current.emit('lock-room', !isRoomLocked);
        }
    };

    const handleMuteParticipant = (targetId) => {
        if (socketRef.current && isHost) {
            socketRef.current.emit('mute-participant', targetId);
        }
    };

    const handleMuteAll = () => {
        if (socketRef.current && isHost) {
            socketRef.current.emit('mute-all');
        }
    };

    const handleRemoveParticipant = (targetId) => {
        if (socketRef.current && isHost) {
            socketRef.current.emit('remove-participant', targetId);
        }
    };

    const handleSpotlightParticipant = (targetId) => {
        if (socketRef.current && isHost) {
            const nextSpotlight = spotlightUser === targetId ? null : targetId;
            socketRef.current.emit('spotlight-participant', nextSpotlight);
        }
    };

    const handleAdmitUser = (waitingId) => {
        if (socketRef.current && isHost) {
            socketRef.current.emit('admit-user', waitingId);
            setWaitingUsers(prev => prev.filter(u => u.id !== waitingId));
        }
    };

    const handleDenyUser = (waitingId) => {
        if (socketRef.current && isHost) {
            socketRef.current.emit('deny-user', waitingId);
            setWaitingUsers(prev => prev.filter(u => u.id !== waitingId));
        }
    };

    // Picture-in-Picture
    const handlePictureInPicture = async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                setIsPipActive(false);
            } else {
                let targetEl = localVideoref.current;
                if (!targetEl || targetEl.style.display === 'none') {
                    targetEl = document.querySelector('video');
                }
                if (targetEl && targetEl.requestPictureInPicture) {
                    await targetEl.requestPictureInPicture();
                    setIsPipActive(true);
                } else {
                    setToastMsg("Picture-in-Picture is not supported by your browser.");
                    setToastOpen(true);
                }
            }
        } catch (e) {
            console.warn("PiP error:", e);
            setToastMsg("Could not activate Picture-in-Picture.");
            setToastOpen(true);
        }
    };

    // Chat Typing Indicator & Auto-Link Formatter
    const handleChatInputChange = () => {
        if (socketRef.current) {
            socketRef.current.emit('typing', username || "Someone");
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                if (socketRef.current) socketRef.current.emit('stop-typing');
            }, 1600);
        }
    };

    const renderMessageContent = (text) => {
        if (!text) return "";
        if (typeof text === 'string' && text.startsWith("data:image/")) {
            return (
                <Box
                    component="img"
                    src={text}
                    alt="Chat attachment"
                    sx={{
                        maxWidth: '100%',
                        maxHeight: 220,
                        borderRadius: '10px',
                        mt: 0.5,
                        display: 'block',
                        cursor: 'pointer',
                        border: '1px solid rgba(0,0,0,0.1)'
                    }}
                    onClick={() => {
                        const win = window.open();
                        if (win) {
                            win.document.write(`<img src="${text}" style="max-width:100%;height:auto;margin:auto;display:block;" />`);
                        }
                    }}
                />
            );
        }
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = String(text).split(urlRegex);
        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const handleChatImageUpload = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setToastMsg("Only image files are allowed.");
            setToastOpen(true);
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setToastMsg("Image size exceeds 2MB limit.");
            setToastOpen(true);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target.result;
            if (socketRef.current && base64Data) {
                socketRef.current.emit('chat-message', base64Data, username);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleChatPaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    handleChatImageUpload(file);
                }
            }
        }
    };

    // Live Captions (Web Speech API)
    const toggleCaptions = () => {
        const nextState = !captionsActive;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setToastMsg("Live captions are not supported in this browser. Please use Chrome or Edge.");
            setToastOpen(true);
            return;
        }

        setCaptionsActive(nextState);

        if (nextState) {
            try {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event) => {
                    let transcript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        transcript += event.results[i][0].transcript;
                    }
                    if (transcript.trim() && socketRef.current) {
                        socketRef.current.emit('caption', transcript, username || "You", true);
                    }
                    setLiveCaptions(prev => [...prev.slice(-3), { sender: username || "You", text: transcript, id: Date.now() + Math.random() }]);
                };

                recognition.onerror = (e) => {
                    console.warn("Speech recognition error:", e);
                };

                recognition.onend = () => {
                    if (captionsActive && recognitionRef.current) {
                        try { recognitionRef.current.start(); } catch (e) {}
                    }
                };

                recognition.start();
                recognitionRef.current = recognition;
                setToastMsg("Live captions turned on.");
                setToastOpen(true);
            } catch (e) {
                console.warn("Speech recognition failed to start:", e);
                setToastMsg("Could not start live captions.");
                setToastOpen(true);
                setCaptionsActive(false);
            }
        } else {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) {}
                recognitionRef.current = null;
            }
            setToastMsg("Live captions turned off.");
            setToastOpen(true);
        }
    };

    // Session Clean Up (Prevents Ghost Tiles and Leaking Tracks)
    const cleanUpSession = useCallback(() => {
        stopAudioVisualizer();
        if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
        if (dockTimerRef.current) clearTimeout(dockTimerRef.current);
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) {}
            recognitionRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try { mediaRecorderRef.current.stop(); } catch (e) {}
        }

        if (window.localStream) {
            try { window.localStream.getTracks().forEach(t => t.stop()); } catch (e) {}
            window.localStream = null;
        }

        if (localVideoref.current && localVideoref.current.srcObject) {
            try {
                localVideoref.current.srcObject.getTracks().forEach(t => t.stop());
                localVideoref.current.srcObject = null;
            } catch (e) {}
        }

        for (let id in connections) {
            try { connections[id].close(); } catch (e) {}
            delete connections[id];
        }

        if (socketRef.current) {
            try { socketRef.current.disconnect(); } catch (e) {}
        }

        setVideos([]);
        videoRef.current = [];
    }, []);

    // Clean disconnect on beforeunload
    useEffect(() => {
        const handleBeforeUnload = () => cleanUpSession();
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            cleanUpSession();
        };
    }, [cleanUpSession]);

    // End call with duration recording and feedback modal
    const handleEndCall = async () => {
        setLeaveModalOpen(false);
        const durationSecs = callStartTimeRef.current 
            ? Math.max(1, Math.round((Date.now() - callStartTimeRef.current) / 1000))
            : 0;

        try {
            const token = localStorage.getItem("token");
            await axios.post(`${server_url}/api/v1/users/add_to_activity`, {
                token,
                meeting_code: url,
                meetingCode: url,
                duration: durationSecs,
                participantCount: videos.length + 1
            });
        } catch (e) {
            console.warn("Could not save meeting activity:", e);
        }

        cleanUpSession();
        setFeedbackModalOpen(true);
    };

    const handleSkipFeedback = () => {
        setFeedbackModalOpen(false);
        navigate("/home");
    };

    const handleSubmitFeedback = async () => {
        setFeedbackSubmitting(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post(`${server_url}/api/v1/users/feedback`, {
                token,
                meetingCode: url,
                rating: feedbackRating,
                comment: feedbackComment
            });
        } catch (e) {
            console.warn("Feedback error:", e);
        } finally {
            setFeedbackSubmitting(false);
            setFeedbackModalOpen(false);
            navigate("/home");
        }
    };

    const copyRoomLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setToastMsg("Meeting room link copied to clipboard!");
        setToastOpen(true);
    };

    const shareOnWhatsApp = () => {
        const link = window.location.href;
        const msg = encodeURIComponent(`Join my secure LiveLink video meeting:\n${link}`);
        window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
    };

    const formatDuration = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Box sx={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#090d16' }}>
            
            {/* =========================================================================
                1. PRE-CALL LOBBY (GREEN ROOM & DEVICE SELECTORS)
                ========================================================================= */}
            {askForUsername === true ? (
                <Box
                    sx={{
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'auto'
                    }}
                >
                    {/* Top Lobby Bar */}
                    <Box
                        sx={{
                            p: 2.5,
                            px: { xs: 2, md: 5 },
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff'
                        }}
                    >
                        <Box
                            onClick={() => navigate('/home')}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
                        >
                            <Box component="img" src="/video.svg" alt="LiveLink" sx={{ width: 34, height: 34 }} />
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                Live<span style={{ color: '#2563eb' }}>Link</span>
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Chip
                                label={`Room: ${url || "Meeting"}`}
                                sx={{ backgroundColor: '#f1f5f9', fontWeight: 600, color: '#475569' }}
                            />
                            <Tooltip title="Copy Room Invite Link">
                                <IconButton size="small" onClick={copyRoomLink}>
                                    <ContentCopyIcon sx={{ fontSize: 18, color: '#2563eb' }} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    {/* Main Lobby Container */}
                    <Box
                        sx={{
                            flexGrow: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: { xs: 2, md: 4 }
                        }}
                    >
                        <Box
                            sx={{
                                width: '100%',
                                maxWidth: 980,
                                display: 'flex',
                                flexDirection: { xs: 'column', md: 'row' },
                                gap: { xs: 3, md: 4.5 },
                                alignItems: 'center'
                            }}
                        >
                            {/* Left: Video Preview & Device Selectors */}
                            <Box sx={{ width: { xs: '100%', md: '56%' }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        position: 'relative',
                                        width: '100%',
                                        aspectRatio: '16/10',
                                        backgroundColor: '#0f172a',
                                        borderRadius: '24px',
                                        overflow: 'hidden',
                                        boxShadow: '0 12px 36px rgba(0,0,0,0.12)',
                                        border: '1px solid #e2e8f0'
                                    }}
                                >
                                    {video && !permissionDenied ? (
                                        <video
                                            ref={localVideoref}
                                            autoPlay
                                            muted
                                            playsInline
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isBackgroundBlur ? 'contrast(1.08) drop-shadow(0 0 16px rgba(0,0,0,0.5))' : 'none' }}
                                        />
                                    ) : (
                                        <Box
                                            sx={{
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 1.5,
                                                color: '#94a3b8'
                                            }}
                                        >
                                            <Avatar
                                                sx={{
                                                    width: 72,
                                                    height: 72,
                                                    fontSize: '1.8rem',
                                                    fontWeight: 800,
                                                    backgroundColor: getAvatarColor(username || "You")
                                                }}
                                            >
                                                {getInitials(username || "You")}
                                            </Avatar>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {permissionDenied ? "Camera Access Denied" : "Camera is turned off"}
                                            </Typography>
                                        </Box>
                                    )}

                                    {/* Test Controls on Preview */}
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            bottom: 16,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            backgroundColor: 'rgba(0,0,0,0.65)',
                                            backdropFilter: 'blur(8px)',
                                            px: 2.5,
                                            py: 0.8,
                                            borderRadius: '20px'
                                        }}
                                    >
                                        <Tooltip title={!videoAvailable ? "No camera detected" : (video ? "Turn camera off" : "Turn camera on")}>
                                            <span>
                                                <IconButton
                                                    onClick={handleVideo}
                                                    disabled={!videoAvailable}
                                                    aria-label="Toggle camera"
                                                    sx={{
                                                        backgroundColor: video ? 'rgba(255,255,255,0.2)' : '#ef4444',
                                                        color: '#ffffff',
                                                        '&:hover': { backgroundColor: video ? 'rgba(255,255,255,0.3)' : '#dc2626' },
                                                        '&.Mui-disabled': { backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }
                                                    }}
                                                >
                                                    {video ? <VideocamIcon /> : <VideocamOffIcon />}
                                                </IconButton>
                                            </span>
                                        </Tooltip>

                                        <Tooltip title={!audioAvailable ? "No microphone detected" : (audio ? "Mute microphone" : "Unmute microphone")}>
                                            <span>
                                                <IconButton
                                                    onClick={handleAudio}
                                                    disabled={!audioAvailable}
                                                    aria-label="Toggle microphone"
                                                    sx={{
                                                        backgroundColor: audio ? 'rgba(255,255,255,0.2)' : '#ef4444',
                                                        color: '#ffffff',
                                                        '&:hover': { backgroundColor: audio ? 'rgba(255,255,255,0.3)' : '#dc2626' },
                                                        '&.Mui-disabled': { backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }
                                                    }}
                                                >
                                                    {audio ? <MicIcon /> : <MicOffIcon />}
                                                </IconButton>
                                            </span>
                                        </Tooltip>

                                        <Tooltip title={isBackgroundBlur ? "Turn off background blur" : "Turn on background blur (Soft focus)"}>
                                            <IconButton
                                                onClick={handleToggleBlur}
                                                aria-label="Toggle background blur"
                                                sx={{
                                                    backgroundColor: isBackgroundBlur ? '#2563eb' : 'rgba(255,255,255,0.2)',
                                                    color: '#ffffff',
                                                    '&:hover': { backgroundColor: isBackgroundBlur ? '#1d4ed8' : 'rgba(255,255,255,0.3)' }
                                                }}
                                            >
                                                {isBackgroundBlur ? <BlurOnIcon /> : <BlurOffIcon />}
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Paper>

                                {/* Waveform Indicator */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        px: 2,
                                        py: 1,
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '12px'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px', height: '20px' }}>
                                            {[0.7, 1.3, 0.9, 1.5, 0.8].map((factor, idx) => {
                                                const barHeight = audio && audioVolume > 6 
                                                    ? Math.max(5, Math.min(18, Math.round(audioVolume * factor * 0.28))) 
                                                    : 5;
                                                return (
                                                    <Box
                                                        key={idx}
                                                        sx={{
                                                            width: 4,
                                                            height: `${barHeight}px`,
                                                            backgroundColor: audio && audioVolume > 6 ? '#16a34a' : '#cbd5e1',
                                                            borderRadius: 2,
                                                            transition: 'height 0.08s ease'
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Box>
                                        <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                                            {audio 
                                                ? (audioVolume > 6 ? "Microphone active" : "Speak to test microphone") 
                                                : "Microphone is muted"}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#16a34a', fontSize: '0.75rem', fontWeight: 700 }}>
                                        <SecurityIcon sx={{ fontSize: 14 }} /> HD Audio Ready
                                    </Box>
                                </Box>

                                {/* Friendly Permission Denied Banner */}
                                {permissionDenied && (
                                    <Alert
                                        severity="warning"
                                        sx={{ borderRadius: '14px', fontSize: '0.85rem' }}
                                        action={
                                            <Button
                                                size="small"
                                                variant="contained"
                                                onClick={joinWithoutMedia}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 700,
                                                    backgroundColor: '#d97706',
                                                    boxShadow: 'none',
                                                    '&:hover': { backgroundColor: '#b45309' }
                                                }}
                                            >
                                                Join without camera/mic
                                            </Button>
                                        }
                                    >
                                        Camera/mic blocked by browser. You can still join as view-only.
                                    </Alert>
                                )}

                                {/* Hardware Device Selectors Card */}
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        backgroundColor: '#ffffff',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1.5
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                                            Hardware &amp; Devices
                                        </Typography>
                                        <Button
                                            size="small"
                                            startIcon={<VolumeUpIcon sx={{ fontSize: 16 }} />}
                                            onClick={handleTestSpeaker}
                                            sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.82rem', color: '#2563eb' }}
                                        >
                                            Test speaker
                                        </Button>
                                    </Box>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                                        {/* Camera Dropdown */}
                                        <FormControl size="small" fullWidth>
                                            <InputLabel id="camera-select-label">Camera</InputLabel>
                                            <Select
                                                labelId="camera-select-label"
                                                value={selectedCamera}
                                                label="Camera"
                                                onChange={(e) => switchCamera(e.target.value)}
                                            >
                                                {videoDevices.map((d, idx) => (
                                                    <MenuItem key={d.deviceId || idx} value={d.deviceId}>
                                                        {d.label || `Camera ${idx + 1}`}
                                                    </MenuItem>
                                                ))}
                                                {videoDevices.length === 0 && <MenuItem value="">Default Camera</MenuItem>}
                                            </Select>
                                        </FormControl>

                                        {/* Microphone Dropdown */}
                                        <FormControl size="small" fullWidth>
                                            <InputLabel id="mic-select-label">Microphone</InputLabel>
                                            <Select
                                                labelId="mic-select-label"
                                                value={selectedMicrophone}
                                                label="Microphone"
                                                onChange={(e) => switchMicrophone(e.target.value)}
                                            >
                                                {audioInputDevices.map((d, idx) => (
                                                    <MenuItem key={d.deviceId || idx} value={d.deviceId}>
                                                        {d.label || `Microphone ${idx + 1}`}
                                                    </MenuItem>
                                                ))}
                                                {audioInputDevices.length === 0 && <MenuItem value="">Default Microphone</MenuItem>}
                                            </Select>
                                        </FormControl>

                                        {/* Speaker Dropdown */}
                                        <FormControl size="small" fullWidth>
                                            <InputLabel id="speaker-select-label">Speaker</InputLabel>
                                            <Select
                                                labelId="speaker-select-label"
                                                value={selectedSpeaker}
                                                label="Speaker"
                                                onChange={(e) => switchSpeaker(e.target.value)}
                                            >
                                                {audioOutputDevices.map((d, idx) => (
                                                    <MenuItem key={d.deviceId || idx} value={d.deviceId}>
                                                        {d.label || `Speaker ${idx + 1}`}
                                                    </MenuItem>
                                                ))}
                                                {audioOutputDevices.length === 0 && <MenuItem value="">Default Speaker</MenuItem>}
                                            </Select>
                                        </FormControl>
                                    </Box>
                                </Paper>
                            </Box>

                            {/* Right: Join Form & People Already in Room */}
                            <Paper
                                elevation={0}
                                sx={{
                                    width: { xs: '100%', md: '44%' },
                                    p: 4,
                                    borderRadius: '24px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#ffffff',
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
                                }}
                            >
                                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                                    Ready to join?
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                                    Verify your display name and join with one click.
                                </Typography>

                                {/* Avatars of people already in the room */}
                                <Box sx={{ mb: 3, p: 2, borderRadius: '16px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', mb: 1 }}>
                                        In this meeting right now ({lobbyRoomParticipants.length})
                                    </Typography>
                                    {lobbyRoomParticipants.length > 0 ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <AvatarGroup max={4}>
                                                {lobbyRoomParticipants.map((p, idx) => (
                                                    <Tooltip title={p.name} key={p.socketId || idx}>
                                                        <Avatar
                                                            src={p.avatar}
                                                            alt={p.name}
                                                            sx={{
                                                                width: 36,
                                                                height: 36,
                                                                backgroundColor: getAvatarColor(p.name),
                                                                fontSize: '0.85rem',
                                                                fontWeight: 700
                                                            }}
                                                        >
                                                            {getInitials(p.name)}
                                                        </Avatar>
                                                    </Tooltip>
                                                ))}
                                            </AvatarGroup>
                                            <Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 600, fontSize: '0.86rem' }}>
                                                {lobbyRoomParticipants.map(p => p.name).slice(0, 2).join(", ")}
                                                {lobbyRoomParticipants.length > 2 ? ` +${lobbyRoomParticipants.length - 2}` : ""}
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748b' }}>
                                            <GroupsIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                                            <Typography variant="body2" sx={{ fontSize: '0.86rem' }}>
                                                No one has joined yet. Be the first one in!
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>

                                <TextField
                                    fullWidth
                                    label="Your Display Name"
                                    placeholder="Enter your name"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') connect();
                                    }}
                                    sx={{ mb: 3 }}
                                />

                                <Button
                                    fullWidth
                                    variant="contained"
                                    onClick={connect}
                                    sx={{
                                        py: 1.5,
                                        backgroundColor: '#2563eb',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        fontSize: '1rem',
                                        borderRadius: '14px',
                                        textTransform: 'none',
                                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                                        mb: 1.5,
                                        '&:hover': { backgroundColor: '#1d4ed8' }
                                    }}
                                >
                                    Join Meeting Now
                                </Button>

                                {permissionDenied && (
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        onClick={joinWithoutMedia}
                                        sx={{
                                            py: 1.2,
                                            mb: 1.5,
                                            color: '#d97706',
                                            borderColor: '#fde68a',
                                            borderRadius: '14px',
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            '&:hover': { backgroundColor: '#fef3c7' }
                                        }}
                                    >
                                        Join without camera/mic
                                    </Button>
                                )}

                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<ArrowBackIcon />}
                                    onClick={() => navigate('/home')}
                                    sx={{
                                        py: 1.2,
                                        color: '#64748b',
                                        borderColor: '#e2e8f0',
                                        borderRadius: '14px',
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        '&:hover': { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' }
                                    }}
                                >
                                    Back to Dashboard
                                </Button>
                            </Paper>
                        </Box>
                    </Box>
                </Box>
            ) : isWaitingForAdmission ? (
                /* WAITING ROOM SCREEN */
                <Box
                    sx={{
                        width: '100vw',
                        height: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#090d16',
                        p: 3
                    }}
                >
                    <Paper
                        elevation={10}
                        sx={{
                            maxWidth: 460,
                            width: '100%',
                            p: 4.5,
                            borderRadius: '24px',
                            backgroundColor: '#0f172a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            textAlign: 'center',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                        }}
                    >
                        <CircularProgress size={46} sx={{ color: '#2563eb', mb: 2.5 }} />
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#ffffff', mb: 1 }}>
                            Waiting to be Admitted
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#94a3b8', mb: 3.5, lineHeight: 1.6 }}>
                            The host has locked this meeting room. Please hang tight, they will admit you shortly.
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={() => { cleanUpSession(); navigate('/home'); }}
                            sx={{
                                color: '#cbd5e1',
                                borderColor: 'rgba(255,255,255,0.2)',
                                textTransform: 'none',
                                borderRadius: '12px',
                                fontWeight: 700,
                                px: 3,
                                py: 1,
                                '&:hover': { borderColor: '#ffffff', backgroundColor: 'rgba(255,255,255,0.05)' }
                            }}
                        >
                            Leave Waiting Room
                        </Button>
                    </Paper>
                </Box>
            ) : (
                /* =========================================================================
                    2. ACTIVE IN-CALL MEETING ROOM
                    ========================================================================= */
                <Box sx={{ display: 'flex', flexDirection: 'row', width: '100vw', height: '100vh', overflow: 'hidden' }}>
                    {/* MAIN STAGE */}
                    <Box sx={{ flexGrow: 1, position: 'relative', height: '100%', backgroundColor: '#090d16' }}>
                        
                        {/* RECONNECTING FLOATING BANNER OR 45-SECOND TIMEOUT FAILURE BANNER */}
                        {reconnectFailed ? (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    backgroundColor: '#dc2626',
                                    color: '#ffffff',
                                    py: 1,
                                    px: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 2,
                                    zIndex: 100,
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                                    flexWrap: 'wrap'
                                }}
                            >
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    Unable to reconnect to the meeting after 45 seconds. Please check your network connection.
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => {
                                        setReconnectFailed(false);
                                        if (socketRef.current) socketRef.current.connect();
                                        for (let id in connections) triggerIceRestart(id);
                                    }}
                                    sx={{ backgroundColor: '#ffffff', color: '#dc2626', fontWeight: 800, textTransform: 'none', borderRadius: '10px' }}
                                >
                                    Retry Connection
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => {
                                        cleanUpSession();
                                        navigate('/home');
                                    }}
                                    sx={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'none', borderRadius: '10px' }}
                                >
                                    Return to Dashboard
                                </Button>
                            </Box>
                        ) : isReconnecting && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    backgroundColor: '#ea580c',
                                    color: '#ffffff',
                                    py: 1,
                                    px: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 1.5,
                                    zIndex: 100,
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                                }}
                            >
                                <CircularProgress size={16} sx={{ color: '#ffffff' }} />
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    Connection lost. Reconnecting to meeting...
                                </Typography>
                            </Box>
                        )}

                        {/* HOST FLOATING WAITING ROOM BANNER */}
                        {isHost && waitingUsers.length > 0 && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: reconnectFailed ? 58 : (isReconnecting ? 48 : 16),
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #3b82f6',
                                    color: '#ffffff',
                                    px: 2.5,
                                    py: 0.8,
                                    borderRadius: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    zIndex: 25,
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                                }}
                            >
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    🚪 {waitingUsers.length} waiting to join
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        onClick={() => handleAdmitUser(waitingUsers[0].id)}
                                        sx={{ backgroundColor: '#16a34a', fontWeight: 700, textTransform: 'none', borderRadius: '8px', px: 1.5, py: 0.2 }}
                                    >
                                        Admit ({waitingUsers[0].username})
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleDenyUser(waitingUsers[0].id)}
                                        sx={{ color: '#ef4444', borderColor: '#ef4444', fontWeight: 700, textTransform: 'none', borderRadius: '8px', px: 1.5, py: 0.2 }}
                                    >
                                        Deny
                                    </Button>
                                </Box>
                            </Box>
                        )}

                        {/* RECORDING NOTICE TO ALL PARTICIPANTS */}
                        {remoteRecordingState.isRecording && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: reconnectFailed ? 58 : (isReconnecting ? 44 : (isHost && waitingUsers.length > 0 ? 64 : 16)),
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'rgba(239, 68, 68, 0.95)',
                                    color: '#ffffff',
                                    px: 2,
                                    py: 0.6,
                                    borderRadius: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    zIndex: 15,
                                    boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)'
                                }}
                            >
                                <FiberManualRecordIcon sx={{ fontSize: 14, animation: 'pulse 1s infinite' }} />
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                    This meeting is being recorded by {remoteRecordingState.host || "Host"}
                                </Typography>
                            </Box>
                        )}

                        {/* TOP STATUS BAR */}
                        <Box
                            sx={{
                                position: 'absolute',
                                top: reconnectFailed ? 58 : (isReconnecting ? 48 : 16),
                                left: 20,
                                right: showModal ? 370 : 20,
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                pointerEvents: 'none'
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pointerEvents: 'auto' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(10px)', px: 2, py: 0.8, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <Box component="img" src="/video.svg" alt="LiveLink" sx={{ width: 22, height: 22 }} />
                                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>
                                        Live<span style={{ color: '#38bdf8' }}>Link</span>
                                    </Typography>
                                </Box>

                                {/* Network Quality Badge */}
                                <Tooltip title={`Network RTT: ${networkStats.rtt}ms | Packet Loss: ${networkStats.loss}%`}>
                                    <Chip
                                        icon={<SignalCellularAltIcon sx={{ 
                                            fontSize: '15px !important',
                                            color: networkStats.quality === 'Good' ? '#22c55e !important' : networkStats.quality === 'Weak' ? '#f59e0b !important' : '#ef4444 !important'
                                        }} />}
                                        label={networkStats.quality}
                                        size="small"
                                        sx={{
                                            backgroundColor: 'rgba(15,23,42,0.85)',
                                            color: '#f8fafc',
                                            fontWeight: 700,
                                            fontSize: '0.78rem',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    />
                                </Tooltip>

                                {/* Local Recording Indicator */}
                                {isRecording && (
                                    <Chip
                                        icon={<FiberManualRecordIcon sx={{ color: '#ef4444 !important', fontSize: '14px !important', animation: 'pulse 1s infinite' }} />}
                                        label={`REC ${formatDuration(recordingSeconds)}`}
                                        size="small"
                                        sx={{
                                            backgroundColor: 'rgba(239, 68, 68, 0.25)',
                                            color: '#ef4444',
                                            fontWeight: 800,
                                            border: '1px solid rgba(239, 68, 68, 0.5)'
                                        }}
                                    />
                                )}

                                {/* Lock Status Pill */}
                                {isHost ? (
                                    <Tooltip title={isRoomLocked ? "Room is locked (Click to unlock)" : "Room is open (Click to lock)"}>
                                        <Chip
                                            icon={isRoomLocked ? <LockIcon sx={{ fontSize: '14px !important', color: '#ef4444 !important' }} /> : <LockOpenIcon sx={{ fontSize: '14px !important', color: '#22c55e !important' }} />}
                                            label={isRoomLocked ? "Locked" : "Open"}
                                            size="small"
                                            onClick={handleLockRoom}
                                            sx={{
                                                backgroundColor: isRoomLocked ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
                                                color: isRoomLocked ? '#ef4444' : '#22c55e',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                border: '1px solid rgba(255,255,255,0.1)'
                                            }}
                                        />
                                    </Tooltip>
                                ) : isRoomLocked ? (
                                    <Chip
                                        icon={<LockIcon sx={{ fontSize: '14px !important', color: '#ef4444 !important' }} />}
                                        label="Locked"
                                        size="small"
                                        sx={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700 }}
                                    />
                                ) : null}
                            </Box>

                            {/* Top Right: View Mode Toggle & Room Code */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pointerEvents: 'auto' }}>
                                <Tooltip title={viewMode === 'grid' ? "Switch to Speaker View" : "Switch to Grid View"}>
                                    <IconButton
                                        size="small"
                                        onClick={() => setViewMode(v => v === 'grid' ? 'speaker' : 'grid')}
                                        sx={{
                                            backgroundColor: 'rgba(15,23,42,0.85)',
                                            color: '#cbd5e1',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            '&:hover': { backgroundColor: 'rgba(30,41,59,0.9)' }
                                        }}
                                    >
                                        {viewMode === 'grid' ? <ViewStreamIcon sx={{ fontSize: 18 }} /> : <GridViewIcon sx={{ fontSize: 18 }} />}
                                    </IconButton>
                                </Tooltip>

                                <Chip
                                    label={url || "Room"}
                                    onClick={copyRoomLink}
                                    onDelete={copyRoomLink}
                                    deleteIcon={<ContentCopyIcon sx={{ fontSize: '14px !important', color: '#94a3b8 !important' }} />}
                                    sx={{
                                        backgroundColor: 'rgba(15,23,42,0.85)',
                                        color: '#cbd5e1',
                                        fontWeight: 600,
                                        fontSize: '0.8rem',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        cursor: 'pointer',
                                        '&:hover': { backgroundColor: 'rgba(30,41,59,0.9)' }
                                    }}
                                />
                            </Box>
                        </Box>

                        {/* VIDEO STAGE: Grid or Speaker/Spotlight with Pinning */}
                        <Box sx={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1, p: { xs: 1, md: 2 }, pt: { xs: 7, md: 8 }, pb: { xs: 9, md: 10 } }}>
                            {videos.length === 0 ? (
                                /* 0 REMOTE PEERS */
                                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Box
                                        sx={{
                                            width: '100%',
                                            maxWidth: 820,
                                            height: '100%',
                                            borderRadius: '24px',
                                            overflow: 'hidden',
                                            position: 'relative',
                                            backgroundColor: '#0f172a',
                                            border: activeSpeakers.local ? '2.5px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                                            boxShadow: activeSpeakers.local ? '0 0 20px rgba(34, 197, 94, 0.5)' : 'none',
                                            transition: 'border 0.2s, box-shadow 0.2s'
                                        }}
                                    >
                                        {video ? (
                                            <video ref={localVideoref} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isBackgroundBlur ? 'contrast(1.08) drop-shadow(0 0 16px rgba(0,0,0,0.5))' : 'none' }} />
                                        ) : (
                                            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                                <Avatar sx={{ width: 96, height: 96, fontSize: '2.4rem', fontWeight: 800, backgroundColor: getAvatarColor(username || "You"), border: '2px solid rgba(255,255,255,0.1)' }}>
                                                    {getInitials(username || "You")}
                                                </Avatar>
                                                <Typography variant="h6" color="#94a3b8" fontWeight={700}>Camera Off</Typography>
                                            </Box>
                                        )}
                                        <Typography sx={nameOverlayStyle}>{username || "You"} (You){hostSocketId && hostSocketId === socketIdRef.current ? " • Host" : ""}</Typography>
                                        <Box sx={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', px: 2.5, py: 1, borderRadius: '20px', color: '#94a3b8', fontSize: '0.88rem', fontWeight: 600 }}>
                                            Waiting for others to join...
                                        </Box>
                                    </Box>
                                </Box>
                            ) : (viewMode === 'speaker' || pinnedUser || spotlightUser || screen) ? (
                                /* SPEAKER / SPOTLIGHT / SCREEN SHARE VIEW */
                                (() => {
                                    const spotlightTarget = pinnedUser || spotlightUser || (screen ? 'local' : (videos[0] ? videos[0].socketId : 'local'));
                                    const isSpotlightLocal = spotlightTarget === 'local';
                                    const spotlightPeer = !isSpotlightLocal ? videos.find(v => v.socketId === spotlightTarget) || videos[0] : null;

                                    return (
                                        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            {/* Large Main Spotlight Tile */}
                                            <Box
                                                sx={{
                                                    flexGrow: 1,
                                                    borderRadius: '24px',
                                                    overflow: 'hidden',
                                                    position: 'relative',
                                                    backgroundColor: '#0f172a',
                                                    border: (isSpotlightLocal ? activeSpeakers.local : activeSpeakers[spotlightPeer?.socketId]) ? '2.5px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                                                    boxShadow: (isSpotlightLocal ? activeSpeakers.local : activeSpeakers[spotlightPeer?.socketId]) ? '0 0 24px rgba(34, 197, 94, 0.5)' : 'none'
                                                }}
                                            >
                                                {isSpotlightLocal ? (
                                                    video ? (
                                                        <video ref={localVideoref} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', filter: isBackgroundBlur ? 'contrast(1.08) drop-shadow(0 0 16px rgba(0,0,0,0.5))' : 'none' }} />
                                                    ) : (
                                                        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                                            <Avatar sx={{ width: 96, height: 96, fontSize: '2.4rem', fontWeight: 800, backgroundColor: getAvatarColor(username || "You") }}>
                                                                {getInitials(username || "You")}
                                                            </Avatar>
                                                            <Typography variant="h6" color="#94a3b8" fontWeight={700}>Camera Off</Typography>
                                                        </Box>
                                                    )
                                                ) : spotlightPeer ? (
                                                    spotlightPeer.videoEnabled !== false ? (
                                                        <video
                                                            ref={ref => { if (ref && spotlightPeer.stream) ref.srcObject = spotlightPeer.stream; }}
                                                            autoPlay
                                                            playsInline
                                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                        />
                                                    ) : (
                                                        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                                            <Avatar src={spotlightPeer.avatar} sx={{ width: 96, height: 96, fontSize: '2.4rem', fontWeight: 800, backgroundColor: getAvatarColor(spotlightPeer.name) }}>
                                                                {getInitials(spotlightPeer.name)}
                                                            </Avatar>
                                                            <Typography variant="h6" color="#cbd5e1" fontWeight={700}>{spotlightPeer.name}</Typography>
                                                        </Box>
                                                    )
                                                ) : null}

                                                {/* Main Tile Overlay Name & Pin Button */}
                                                <Typography sx={nameOverlayStyle}>
                                                    {isSpotlightLocal ? `${username || "You"} (You)` : spotlightPeer?.name}
                                                    {spotlightPeer && hostSocketId === spotlightPeer.socketId ? " • Host" : ""}
                                                    {isSpotlightLocal && hostSocketId === socketIdRef.current ? " • Host" : ""}
                                                    {pinnedUser ? " 📌 Pinned" : (spotlightUser === (isSpotlightLocal ? socketIdRef.current : spotlightPeer?.socketId) ? " 🌟 Spotlighted" : "")}
                                                </Typography>

                                                {isHost && (
                                                    <Tooltip title={spotlightUser === (isSpotlightLocal ? socketIdRef.current : spotlightPeer?.socketId) ? "Remove spotlight for everyone" : "Spotlight for everyone"}>
                                                        <IconButton
                                                            onClick={() => handleSpotlightParticipant(isSpotlightLocal ? socketIdRef.current : spotlightPeer?.socketId)}
                                                            sx={{ position: 'absolute', top: 12, right: 54, color: spotlightUser === (isSpotlightLocal ? socketIdRef.current : spotlightPeer?.socketId) ? '#eab308' : '#cbd5e1', backgroundColor: 'rgba(0,0,0,0.5)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' } }}
                                                        >
                                                            <PushPinIcon sx={{ fontSize: 18, transform: 'rotate(45deg)' }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}

                                                <Tooltip title={pinnedUser ? "Unpin participant" : "Pin participant"}>
                                                    <IconButton
                                                        onClick={() => setPinnedUser(pinnedUser ? null : (isSpotlightLocal ? 'local' : spotlightPeer?.socketId))}
                                                        sx={{ position: 'absolute', top: 12, right: 12, color: pinnedUser ? '#38bdf8' : '#cbd5e1', backgroundColor: 'rgba(0,0,0,0.5)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' } }}
                                                    >
                                                        <PushPinIcon sx={{ fontSize: 18 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>

                                            {/* Horizontal Row of Other Participants */}
                                            <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', py: 0.5, height: { xs: '110px', md: '140px' } }}>
                                                {/* Local Tile if not spotlight */}
                                                {!isSpotlightLocal && (
                                                    <Box
                                                        onClick={() => setPinnedUser('local')}
                                                        sx={{
                                                            minWidth: { xs: '110px', md: '160px' },
                                                            height: '100%',
                                                            borderRadius: '16px',
                                                            overflow: 'hidden',
                                                            position: 'relative',
                                                            backgroundColor: '#0f172a',
                                                            cursor: 'pointer',
                                                            border: activeSpeakers.local ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)'
                                                        }}
                                                    >
                                                        {video ? (
                                                            <video ref={miniLocalVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Avatar sx={{ width: 40, height: 40, fontSize: '0.9rem', fontWeight: 800, backgroundColor: getAvatarColor(username || "You") }}>
                                                                    {getInitials(username || "You")}
                                                                </Avatar>
                                                            </Box>
                                                        )}
                                                        <Typography sx={{ ...nameOverlayStyle, bottom: 4, left: 4, fontSize: '10px' }}>You</Typography>
                                                    </Box>
                                                )}

                                                {/* Remote Peers not spotlighted */}
                                                {videos.filter(p => p.socketId !== spotlightTarget).map(p => (
                                                    <Box
                                                        key={p.socketId}
                                                        onClick={() => setPinnedUser(p.socketId)}
                                                        sx={{
                                                            minWidth: { xs: '110px', md: '160px' },
                                                            height: '100%',
                                                            borderRadius: '16px',
                                                            overflow: 'hidden',
                                                            position: 'relative',
                                                            backgroundColor: '#0f172a',
                                                            cursor: 'pointer',
                                                            border: activeSpeakers[p.socketId] ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)'
                                                        }}
                                                    >
                                                        {p.videoEnabled !== false ? (
                                                            <video
                                                                ref={ref => { if (ref && p.stream) ref.srcObject = p.stream; }}
                                                                autoPlay
                                                                playsInline
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            />
                                                        ) : (
                                                            <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Avatar src={p.avatar} sx={{ width: 40, height: 40, fontSize: '0.9rem', fontWeight: 800, backgroundColor: getAvatarColor(p.name) }}>
                                                                    {getInitials(p.name)}
                                                                </Avatar>
                                                            </Box>
                                                        )}
                                                        <audio ref={ref => { if (ref && p.stream) ref.srcObject = p.stream; }} autoPlay />
                                                        <Typography sx={{ ...nameOverlayStyle, bottom: 4, left: 4, fontSize: '10px' }}>{p.name}</Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Box>
                                    );
                                })()
                            ) : (
                                /* RESPONSIVE GRID MODE */
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'grid',
                                        gridTemplateColumns: videos.length <= 1 ? { xs: '1fr', md: '1fr 1fr' } : videos.length <= 3 ? { xs: '1fr 1fr', md: '1fr 1fr' } : { xs: '1fr 1fr', md: '1fr 1fr 1fr' },
                                        gap: 2,
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {/* Local Participant Tile */}
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '20px',
                                            overflow: 'hidden',
                                            backgroundColor: '#0f172a',
                                            border: activeSpeakers.local ? '2.5px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                                            boxShadow: activeSpeakers.local ? '0 0 20px rgba(34, 197, 94, 0.5)' : 'none'
                                        }}
                                    >
                                        {video ? (
                                            <video ref={localVideoref} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ width: 72, height: 72, fontSize: '1.8rem', fontWeight: 800, backgroundColor: getAvatarColor(username || "You") }}>
                                                    {getInitials(username || "You")}
                                                </Avatar>
                                                <Typography variant="body2" color="#94a3b8" fontWeight={700}>Camera Off</Typography>
                                            </Box>
                                        )}
                                        <Typography sx={nameOverlayStyle}>{username || "You"} (You){hostSocketId && hostSocketId === socketIdRef.current ? " • Host" : ""}</Typography>
                                        <Tooltip title="Pin participant">
                                            <IconButton
                                                size="small"
                                                onClick={() => setPinnedUser('local')}
                                                sx={{ position: 'absolute', top: 8, right: 8, color: '#94a3b8', backgroundColor: 'rgba(0,0,0,0.5)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' } }}
                                            >
                                                <PushPinIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>

                                    {/* Remote Participants Tiles */}
                                    {videos.map((peer) => {
                                        const isSpeaking = activeSpeakers[peer.socketId];
                                        return (
                                            <Box
                                                key={peer.socketId}
                                                sx={{
                                                    position: 'relative',
                                                    width: '100%',
                                                    height: '100%',
                                                    borderRadius: '20px',
                                                    overflow: 'hidden',
                                                    backgroundColor: '#0f172a',
                                                    border: isSpeaking ? '2.5px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                                                    boxShadow: isSpeaking ? '0 0 20px rgba(34, 197, 94, 0.5)' : 'none'
                                                }}
                                            >
                                                {peer.videoEnabled !== false ? (
                                                    <video
                                                        ref={ref => { if (ref && peer.stream) ref.srcObject = peer.stream; }}
                                                        autoPlay
                                                        playsInline
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                                                        <Avatar src={peer.avatar} sx={{ width: 72, height: 72, fontSize: '1.8rem', fontWeight: 800, backgroundColor: getAvatarColor(peer.name) }}>
                                                            {getInitials(peer.name)}
                                                        </Avatar>
                                                        <Typography variant="body2" color="#cbd5e1" fontWeight={700}>{peer.name}</Typography>
                                                    </Box>
                                                )}
                                                <audio ref={ref => { if (ref && peer.stream) ref.srcObject = peer.stream; }} autoPlay />
                                                <Typography sx={nameOverlayStyle}>{peer.name}{hostSocketId && hostSocketId === peer.socketId ? " • Host" : ""}</Typography>
                                                <Tooltip title="Pin participant">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setPinnedUser(peer.socketId)}
                                                        sx={{ position: 'absolute', top: 8, right: 8, color: '#94a3b8', backgroundColor: 'rgba(0,0,0,0.5)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' } }}
                                                    >
                                                        <PushPinIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            )}
                        </Box>

                        {/* LIVE CAPTIONS OVERLAY */}
                        {captionsActive && liveCaptions.length > 0 && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: isMobile ? 80 : 100,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'rgba(15,23,42,0.88)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#ffffff',
                                    px: 3,
                                    py: 1.2,
                                    borderRadius: '16px',
                                    maxWidth: '80%',
                                    textAlign: 'center',
                                    zIndex: 18,
                                    pointerEvents: 'none',
                                    boxShadow: '0 8px 30px rgba(0,0,0,0.4)'
                                }}
                            >
                                {liveCaptions.map((cap) => (
                                    <Typography key={cap.id} variant="body2" sx={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.92rem' }}>
                                        <strong style={{ color: '#38bdf8' }}>{cap.sender}:</strong> {cap.text}
                                    </Typography>
                                ))}
                            </Box>
                        )}

                        {/* "YOU ARE MUTED" SPEAKING HINT PILL */}
                        {showMutedSpeakingHint && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: isMobile ? 80 : 96,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'rgba(239, 68, 68, 0.95)',
                                    color: '#ffffff',
                                    px: 2.5,
                                    py: 1,
                                    borderRadius: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
                                    zIndex: 30
                                }}
                            >
                                <MicOffIcon sx={{ fontSize: 20 }} />
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    You are speaking while muted
                                </Typography>
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={handleAudio}
                                    sx={{
                                        backgroundColor: '#ffffff',
                                        color: '#ef4444',
                                        fontWeight: 800,
                                        fontSize: '0.78rem',
                                        borderRadius: '12px',
                                        px: 1.5,
                                        py: 0.3,
                                        textTransform: 'none',
                                        boxShadow: 'none',
                                        '&:hover': { backgroundColor: '#f8fafc' }
                                    }}
                                >
                                    Unmute (M)
                                </Button>
                            </Box>
                        )}

                        {/* FLOATING EMOJI REACTIONS OVERLAY */}
                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15, overflow: 'hidden' }}>
                            {reactions.map((r) => (
                                <Box
                                    key={r.id}
                                    sx={{
                                        position: 'absolute',
                                        left: `${r.left}%`,
                                        bottom: 120,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        animation: 'floatReaction 2.6s ease-out forwards'
                                    }}
                                >
                                    <Typography sx={{ fontSize: '38px', lineHeight: 1 }}>{r.emoji}</Typography>
                                    <Typography sx={{ fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(15,23,42,0.85)', color: '#f8fafc', px: 1.2, py: 0.25, borderRadius: '12px', whiteSpace: 'nowrap', mt: 0.5 }}>
                                        {r.sender}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>

                        {/* CONTROL DOCK SYSTEM */}
                        <Box
                            sx={{
                                position: isMobile ? 'fixed' : 'absolute',
                                bottom: isMobile ? 0 : '24px',
                                left: isMobile ? 0 : '50%',
                                right: isMobile ? 0 : 'auto',
                                transform: isMobile 
                                    ? (isDockVisible ? 'translateY(0)' : 'translateY(100%)')
                                    : (isDockVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(120%)'),
                                opacity: isDockVisible ? 1 : 0,
                                transition: 'transform 0.35s ease, opacity 0.35s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isMobile ? 'space-around' : 'center',
                                gap: isMobile ? 1 : 1.5,
                                zIndex: 20,
                                backgroundColor: isMobile ? '#0f172a' : 'rgba(15,23,42,0.88)',
                                backdropFilter: 'blur(16px)',
                                px: isMobile ? 2 : 2.5,
                                py: isMobile ? 1.2 : 1,
                                borderRadius: isMobile ? 0 : '24px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                borderTop: isMobile ? '1px solid rgba(255,255,255,0.1)' : undefined,
                                pointerEvents: isDockVisible ? 'auto' : 'none'
                            }}
                        >
                            {/* Camera Toggle */}
                            <Tooltip title={video ? "Turn Camera Off (V)" : "Turn Camera On (V)"}>
                                <IconButton
                                    onClick={handleVideo}
                                    aria-label="Toggle camera"
                                    sx={{
                                        color: "white",
                                        minWidth: 44,
                                        minHeight: 44,
                                        backgroundColor: video ? 'rgba(255,255,255,0.08)' : '#ef4444',
                                        '&:hover': { backgroundColor: video ? 'rgba(255,255,255,0.18)' : '#dc2626' }
                                    }}
                                >
                                    {video ? <VideocamIcon sx={{ fontSize: 24 }} /> : <VideocamOffIcon sx={{ fontSize: 24 }} />}
                                </IconButton>
                            </Tooltip>

                            {/* Mic Toggle */}
                            <Tooltip title={audio ? "Mute Microphone (M)" : "Unmute Microphone (M)"}>
                                <IconButton
                                    onClick={handleAudio}
                                    aria-label="Toggle microphone"
                                    sx={{
                                        color: "white",
                                        minWidth: 44,
                                        minHeight: 44,
                                        backgroundColor: audio ? 'rgba(255,255,255,0.08)' : '#ef4444',
                                        '&:hover': { backgroundColor: audio ? 'rgba(255,255,255,0.18)' : '#dc2626' }
                                    }}
                                >
                                    {audio ? <MicIcon sx={{ fontSize: 24 }} /> : <MicOffIcon sx={{ fontSize: 24 }} />}
                                </IconButton>
                            </Tooltip>

                            {/* Leave Call */}
                            <Tooltip title="Leave Meeting">
                                <IconButton
                                    onClick={() => setLeaveModalOpen(true)}
                                    aria-label="Leave meeting"
                                    sx={{
                                        backgroundColor: '#dc2626',
                                        color: '#ffffff',
                                        minWidth: 44,
                                        minHeight: 44,
                                        '&:hover': { backgroundColor: '#b91c1c' }
                                    }}
                                >
                                    <CallEndIcon sx={{ fontSize: 24 }} />
                                </IconButton>
                            </Tooltip>

                            {/* DESKTOP-ONLY CONTROLS */}
                            {!isMobile && (
                                <>
                                    {/* Screen Share */}
                                    {screenAvailable === true && (
                                        <Tooltip title={screen ? "Stop Sharing Screen" : "Share Screen"}>
                                            <IconButton
                                                onClick={handleScreen}
                                                aria-label="Share screen"
                                                sx={{
                                                    color: "white",
                                                    minWidth: 44,
                                                    minHeight: 44,
                                                    backgroundColor: screen ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255,255,255,0.08)',
                                                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' }
                                                }}
                                            >
                                                {screen ? <ScreenShareIcon sx={{ fontSize: 24, color: '#22c55e' }} /> : <StopScreenShareIcon sx={{ fontSize: 24 }} />}
                                            </IconButton>
                                        </Tooltip>
                                    )}

                                    {/* Record to device */}
                                    <Tooltip title={isRecording ? "Stop Recording (Save to device)" : "Record to your device (WebM)"}>
                                        <IconButton
                                            onClick={handleToggleRecording}
                                            aria-label="Record meeting"
                                            sx={{
                                                color: isRecording ? '#ef4444' : 'white',
                                                minWidth: 44,
                                                minHeight: 44,
                                                backgroundColor: isRecording ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
                                                '&:hover': { backgroundColor: isRecording ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.18)' }
                                            }}
                                        >
                                            {isRecording ? <StopIcon sx={{ fontSize: 24 }} /> : <FiberManualRecordIcon sx={{ fontSize: 24 }} />}
                                        </IconButton>
                                    </Tooltip>

                                    {/* Raise Hand */}
                                    <Tooltip title={isHandRaised ? "Lower Hand (H)" : "Raise Hand (H)"}>
                                        <IconButton
                                            onClick={handleToggleRaiseHand}
                                            aria-label="Raise hand"
                                            sx={{
                                                color: isHandRaised ? '#f59e0b' : 'white',
                                                minWidth: 44,
                                                minHeight: 44,
                                                backgroundColor: isHandRaised ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.08)',
                                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' }
                                            }}
                                        >
                                            <PanToolIcon sx={{ fontSize: 22 }} />
                                        </IconButton>
                                    </Tooltip>

                                    {/* Live Reactions */}
                                    <Box sx={{ position: 'relative' }}>
                                        <Tooltip title="Send Reaction">
                                            <IconButton
                                                onClick={() => setReactionMenuOpen(!reactionMenuOpen)}
                                                aria-label="Reactions"
                                                sx={{
                                                    color: 'white',
                                                    minWidth: 44,
                                                    minHeight: 44,
                                                    backgroundColor: reactionMenuOpen ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.08)',
                                                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' }
                                                }}
                                            >
                                                <AddReactionIcon sx={{ fontSize: 23 }} />
                                            </IconButton>
                                        </Tooltip>

                                        {reactionMenuOpen && (
                                            <Paper
                                                elevation={12}
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: '56px',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    display: 'flex',
                                                    gap: 0.5,
                                                    p: 0.8,
                                                    borderRadius: '30px',
                                                    backgroundColor: 'rgba(15,23,42,0.92)',
                                                    backdropFilter: 'blur(16px)',
                                                    border: '1px solid rgba(255,255,255,0.15)',
                                                    zIndex: 25
                                                }}
                                            >
                                                {['👍', '❤️', '👏', '😂', '🔥', '🎉'].map((emoji) => (
                                                    <IconButton
                                                        key={emoji}
                                                        onClick={() => handleSendReaction(emoji)}
                                                        sx={{ fontSize: '20px', p: 0.8, '&:hover': { transform: 'scale(1.3)' } }}
                                                    >
                                                        {emoji}
                                                    </IconButton>
                                                ))}
                                            </Paper>
                                        )}
                                    </Box>

                                    {/* Picture-in-Picture */}
                                    <Tooltip title={isPipActive ? "Exit Picture-in-Picture" : "Picture-in-Picture"}>
                                        <IconButton
                                            onClick={handlePictureInPicture}
                                            aria-label="Picture-in-Picture"
                                            sx={{
                                                color: isPipActive ? '#38bdf8' : 'white',
                                                minWidth: 44,
                                                minHeight: 44,
                                                backgroundColor: isPipActive ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.08)',
                                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' }
                                            }}
                                        >
                                            <PictureInPictureAltIcon sx={{ fontSize: 22 }} />
                                        </IconButton>
                                    </Tooltip>

                                    {/* Live Captions Toggle */}
                                    <Tooltip title={captionsActive ? "Turn Off Live Captions" : "Live Captions (Web Speech)"}>
                                        <IconButton
                                            onClick={toggleCaptions}
                                            aria-label="Live captions"
                                            sx={{
                                                color: captionsActive ? '#22c55e' : 'white',
                                                minWidth: 44,
                                                minHeight: 44,
                                                backgroundColor: captionsActive ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
                                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' }
                                            }}
                                        >
                                            {captionsActive ? <ClosedCaptionIcon sx={{ fontSize: 24 }} /> : <ClosedCaptionDisabledIcon sx={{ fontSize: 24 }} />}
                                        </IconButton>
                                    </Tooltip>

                                    {/* Meeting Chat Toggle */}
                                    <Tooltip title="In-Call Chat (C)">
                                        <IconButton
                                            onClick={() => {
                                                setModal(!showModal);
                                                setNewMessages(0);
                                            }}
                                            aria-label="Open chat"
                                            sx={{
                                                color: 'white',
                                                minWidth: 44,
                                                minHeight: 44,
                                                backgroundColor: showModal ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255,255,255,0.08)',
                                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' }
                                            }}
                                        >
                                            <Badge badgeContent={newMessages} color="primary">
                                                <ChatIcon sx={{ fontSize: 23 }} />
                                            </Badge>
                                        </IconButton>
                                    </Tooltip>

                                    {/* Privacy Shield */}
                                    <Tooltip title="Emergency Privacy Shield">
                                        <IconButton
                                            onClick={handlePrivacyShield}
                                            aria-label="Privacy shield"
                                            sx={{ color: '#f59e0b', minWidth: 44, minHeight: 44, backgroundColor: 'rgba(255,255,255,0.08)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' } }}
                                        >
                                            <SecurityIcon sx={{ fontSize: 23 }} />
                                        </IconButton>
                                    </Tooltip>

                                    {/* Audio & Video Settings */}
                                    <Tooltip title="Audio & Video Settings">
                                        <IconButton
                                            onClick={() => setDeviceSettingsOpen(true)}
                                            aria-label="Audio and video settings"
                                            sx={{ color: 'white', minWidth: 44, minHeight: 44, backgroundColor: 'rgba(255,255,255,0.08)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' } }}
                                        >
                                            <SettingsIcon sx={{ fontSize: 22 }} />
                                        </IconButton>
                                    </Tooltip>

                                    {/* Fullscreen Toggle */}
                                    <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                                        <IconButton
                                            onClick={handleFullscreen}
                                            aria-label="Toggle fullscreen"
                                            sx={{ color: 'white', minWidth: 44, minHeight: 44, backgroundColor: 'rgba(255,255,255,0.08)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)' } }}
                                        >
                                            {isFullscreen ? <FullscreenExitIcon sx={{ fontSize: 23 }} /> : <FullscreenIcon sx={{ fontSize: 23 }} />}
                                        </IconButton>
                                    </Tooltip>
                                </>
                            )}

                            {/* MOBILE "MORE" OVERFLOW BUTTON */}
                            {isMobile && (
                                <IconButton
                                    onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
                                    aria-label="More call controls"
                                    sx={{
                                        color: 'white',
                                        minWidth: 44,
                                        minHeight: 44,
                                        backgroundColor: 'rgba(255,255,255,0.08)'
                                    }}
                                >
                                    <Badge badgeContent={newMessages} color="primary">
                                        <MoreVertIcon sx={{ fontSize: 24 }} />
                                    </Badge>
                                </IconButton>
                            )}
                        </Box>

                        {/* MOBILE MORE MENU */}
                        <Menu
                            anchorEl={moreMenuAnchor}
                            open={Boolean(moreMenuAnchor)}
                            onClose={() => setMoreMenuAnchor(null)}
                            PaperProps={{
                                sx: {
                                    backgroundColor: '#0f172a',
                                    color: '#f8fafc',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    minWidth: 200
                                }
                            }}
                        >
                            <MenuItem onClick={() => { setMoreMenuAnchor(null); setModal(true); setNewMessages(0); }}>
                                <ChatIcon sx={{ mr: 1.5, fontSize: 20 }} /> Chat {newMessages > 0 && `(${newMessages})`}
                            </MenuItem>
                            <MenuItem onClick={() => { setMoreMenuAnchor(null); handleToggleRaiseHand(); }}>
                                <PanToolIcon sx={{ mr: 1.5, fontSize: 20, color: isHandRaised ? '#f59e0b' : 'inherit' }} />
                                {isHandRaised ? "Lower Hand" : "Raise Hand"}
                            </MenuItem>
                            <MenuItem onClick={() => { setMoreMenuAnchor(null); toggleCaptions(); }}>
                                <ClosedCaptionIcon sx={{ mr: 1.5, fontSize: 20, color: captionsActive ? '#22c55e' : 'inherit' }} />
                                {captionsActive ? "Turn Off Captions" : "Live Captions"}
                            </MenuItem>
                            <MenuItem onClick={() => { setMoreMenuAnchor(null); handlePictureInPicture(); }}>
                                <PictureInPictureAltIcon sx={{ mr: 1.5, fontSize: 20 }} /> Picture-in-Picture
                            </MenuItem>
                            <MenuItem onClick={() => { setMoreMenuAnchor(null); handleToggleRecording(); }}>
                                <FiberManualRecordIcon sx={{ mr: 1.5, fontSize: 20, color: isRecording ? '#ef4444' : 'inherit' }} />
                                {isRecording ? "Stop Recording" : "Record to Device"}
                            </MenuItem>
                            <MenuItem onClick={() => { setMoreMenuAnchor(null); handleFullscreen(); }}>
                                {isFullscreen ? <FullscreenExitIcon sx={{ mr: 1.5, fontSize: 20 }} /> : <FullscreenIcon sx={{ mr: 1.5, fontSize: 20 }} />}
                                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                            </MenuItem>
                            <MenuItem onClick={() => { setMoreMenuAnchor(null); handleTestSpeaker(); }}>
                                <VolumeUpIcon sx={{ mr: 1.5, fontSize: 20 }} /> Test Speaker
                            </MenuItem>
                            <MenuItem onClick={() => { setMoreMenuAnchor(null); handlePrivacyShield(); }}>
                                <SecurityIcon sx={{ mr: 1.5, fontSize: 20, color: '#f59e0b' }} /> Privacy Shield
                            </MenuItem>
                            <MenuItem onClick={() => { setMoreMenuAnchor(null); setDeviceSettingsOpen(true); }}>
                                <SettingsIcon sx={{ mr: 1.5, fontSize: 20 }} /> Audio & Video Settings
                            </MenuItem>
                            <MenuItem onClick={() => { setMoreMenuAnchor(null); setMeetingInfoOpen(true); }}>
                                <InfoOutlinedIcon sx={{ mr: 1.5, fontSize: 20 }} /> Meeting Info
                            </MenuItem>
                        </Menu>
                    </Box>

                    {/* RIGHT SIDE PANEL: CHAT & PARTICIPANTS */}
                    {showModal && (
                        <Paper
                            elevation={16}
                            sx={{
                                width: { xs: '100vw', sm: '360px' },
                                position: { xs: 'fixed', sm: 'relative' },
                                right: 0,
                                top: 0,
                                bottom: 0,
                                height: '100%',
                                backgroundColor: '#ffffff',
                                borderLeft: '1px solid #e2e8f0',
                                display: 'flex',
                                flexDirection: 'column',
                                zIndex: 30
                            }}
                        >
                            <Tabs
                                value={drawerTab}
                                onChange={(_, v) => setDrawerTab(v)}
                                variant="fullWidth"
                                sx={{ borderBottom: '1px solid #e2e8f0' }}
                            >
                                <Tab label="In-Call Chat" sx={{ fontWeight: 700, textTransform: 'none' }} />
                                <Tab label={`People (${videos.length + 1})`} sx={{ fontWeight: 700, textTransform: 'none' }} />
                            </Tabs>

                            {drawerTab === 0 ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 2, overflow: 'hidden' }}>
                                    <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, pr: 0.5 }}>
                                        {messages.length === 0 ? (
                                            <Typography variant="body2" color="#94a3b8" textAlign="center" mt={6}>
                                                Messages sent during this call appear here.
                                            </Typography>
                                        ) : (
                                            messages.map((m, idx) => {
                                                const isMe = m.sender === username;
                                                return (
                                                    <Box key={idx} sx={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, px: 0.5 }}>
                                                            {m.sender}
                                                        </Typography>
                                                        <Paper
                                                            elevation={0}
                                                            sx={{
                                                                p: 1.2,
                                                                borderRadius: '12px',
                                                                backgroundColor: isMe ? '#2563eb' : '#f1f5f9',
                                                                color: isMe ? '#ffffff' : '#0f172a'
                                                            }}
                                                        >
                                                            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                                                {renderMessageContent(m.data)}
                                                            </Typography>
                                                        </Paper>
                                                    </Box>
                                                );
                                            })
                                        )}
                                    </Box>

                                    {/* Typing Indicator */}
                                    {typingUser && (
                                        <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 600, py: 0.5, fontStyle: 'italic' }}>
                                            {typingUser} is typing...
                                        </Typography>
                                    )}

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 1, borderTop: '1px solid #f1f5f9' }}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={chatFileInputRef}
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    handleChatImageUpload(e.target.files[0]);
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                        <Tooltip title="Send Image (max 2MB or paste)">
                                            <IconButton
                                                size="small"
                                                onClick={() => chatFileInputRef.current?.click()}
                                                sx={{ color: '#64748b' }}
                                                aria-label="Upload image to chat"
                                            >
                                                <ImageIcon sx={{ fontSize: 20 }} />
                                            </IconButton>
                                        </Tooltip>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            placeholder="Type a message or paste image..."
                                            inputRef={messageInputRef}
                                            onChange={handleChatInputChange}
                                            onPaste={handleChatPaste}
                                            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                                        />
                                        <Button variant="contained" onClick={sendMessage} sx={{ backgroundColor: '#2563eb', fontWeight: 700 }}>
                                            Send
                                        </Button>
                                    </Box>
                                </Box>
                            ) : (
                                <Box sx={{ p: 2, overflowY: 'auto', flexGrow: 1 }}>
                                    {/* HOST CONTROLS BAR */}
                                    {isHost && (
                                        <Box sx={{ p: 1.5, mb: 2, borderRadius: '14px', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                                                Host Controls
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={handleLockRoom}
                                                    startIcon={isRoomLocked ? <LockOpenIcon sx={{ fontSize: 16 }} /> : <LockIcon sx={{ fontSize: 16 }} />}
                                                    sx={{
                                                        textTransform: 'none',
                                                        fontWeight: 700,
                                                        fontSize: '0.78rem',
                                                        flexGrow: 1,
                                                        color: isRoomLocked ? '#16a34a' : '#ef4444',
                                                        borderColor: isRoomLocked ? '#86efac' : '#fca5a5'
                                                    }}
                                                >
                                                    {isRoomLocked ? "Unlock Room" : "Lock Room"}
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={handleMuteAll}
                                                    startIcon={<MicOffIcon sx={{ fontSize: 16 }} />}
                                                    sx={{
                                                        textTransform: 'none',
                                                        fontWeight: 700,
                                                        fontSize: '0.78rem',
                                                        flexGrow: 1,
                                                        color: '#d97706',
                                                        borderColor: '#fde68a'
                                                    }}
                                                >
                                                    Mute All
                                                </Button>
                                            </Box>
                                        </Box>
                                    )}

                                    {/* WAITING ROOM QUEUE IN PEOPLE TAB */}
                                    {isHost && waitingUsers.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', display: 'block', mb: 1 }}>
                                                Waiting Room ({waitingUsers.length})
                                            </Typography>
                                            {waitingUsers.map(u => (
                                                <Box key={u.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, mb: 1, borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2' }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{u.username}</Typography>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <Button size="small" variant="contained" onClick={() => handleAdmitUser(u.id)} sx={{ backgroundColor: '#16a34a', minWidth: 'auto', px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 700 }}>
                                                            Admit
                                                        </Button>
                                                        <Button size="small" variant="outlined" onClick={() => handleDenyUser(u.id)} sx={{ color: '#ef4444', borderColor: '#fca5a5', minWidth: 'auto', px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 700 }}>
                                                            Deny
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Box>
                                    )}

                                    <List>
                                        {/* You */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.2, mb: 1, borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Avatar sx={{ width: 34, height: 34, fontSize: '0.85rem', fontWeight: 700, backgroundColor: getAvatarColor(username || "You") }}>
                                                    {getInitials(username || "You")}
                                                </Avatar>
                                                <Typography variant="body2" fontWeight={700}>
                                                    {username || "You"} (You){hostSocketId && hostSocketId === socketIdRef.current ? " • Host" : ""}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {isHandRaised && <PanToolIcon sx={{ fontSize: 18, color: '#f59e0b' }} />}
                                                <Tooltip title="Pin yourself">
                                                    <IconButton size="small" onClick={() => setPinnedUser(pinnedUser === 'local' ? null : 'local')}>
                                                        <PushPinIcon sx={{ fontSize: 16, color: pinnedUser === 'local' ? '#2563eb' : '#94a3b8' }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>

                                        {/* Remote Peers */}
                                        {videos.map((peer) => (
                                            <Box key={peer.socketId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.2, mb: 1, borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Avatar src={peer.avatar} sx={{ width: 34, height: 34, fontSize: '0.85rem', fontWeight: 700, backgroundColor: getAvatarColor(peer.name) }}>
                                                        {getInitials(peer.name)}
                                                    </Avatar>
                                                    <Typography variant="body2" fontWeight={700}>
                                                        {peer.name}{hostSocketId && hostSocketId === peer.socketId ? " • Host" : ""}
                                                    </Typography>
                                                </Box>

                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    {raisedHands[peer.socketId]?.isRaised && <PanToolIcon sx={{ fontSize: 18, color: '#f59e0b', mr: 0.5 }} />}
                                                    
                                                    {/* Host Action Buttons */}
                                                    {isHost && (
                                                        <>
                                                            <Tooltip title="Mute participant">
                                                                <IconButton size="small" onClick={() => handleMuteParticipant(peer.socketId)}>
                                                                    <MicOffIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Remove participant">
                                                                <IconButton size="small" onClick={() => handleRemoveParticipant(peer.socketId)}>
                                                                    <PersonRemoveIcon sx={{ fontSize: 16, color: '#dc2626' }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title={spotlightUser === peer.socketId ? "Remove spotlight for everyone" : "Spotlight for everyone"}>
                                                                <IconButton size="small" onClick={() => handleSpotlightParticipant(peer.socketId)}>
                                                                    <PushPinIcon sx={{ fontSize: 16, color: spotlightUser === peer.socketId ? '#eab308' : '#94a3b8', transform: 'rotate(45deg)' }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </>
                                                    )}

                                                    <Tooltip title={pinnedUser === peer.socketId ? "Unpin participant" : "Pin participant"}>
                                                        <IconButton size="small" onClick={() => setPinnedUser(pinnedUser === peer.socketId ? null : peer.socketId)}>
                                                            <PushPinIcon sx={{ fontSize: 16, color: pinnedUser === peer.socketId ? '#2563eb' : '#94a3b8' }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </Box>
                                        ))}
                                    </List>
                                </Box>
                            )}
                        </Paper>
                    )}
                </Box>
            )}

            {/* Leave Call Confirmation Modal */}
            <Dialog open={leaveModalOpen} onClose={() => setLeaveModalOpen(false)}>
                <DialogTitle sx={{ fontWeight: 800 }}>Leave Meeting?</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="#64748b">
                        Are you sure you want to leave this call? You can rejoin anytime with the meeting link.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setLeaveModalOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
                    <Button variant="contained" onClick={handleEndCall} sx={{ backgroundColor: '#dc2626', fontWeight: 700, '&:hover': { backgroundColor: '#b91c1c' } }}>
                        Leave Call
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Admission Denied Dialog */}
            <Dialog open={admissionDenied} onClose={() => navigate('/home')}>
                <DialogTitle sx={{ fontWeight: 800, color: '#dc2626' }}>Admission Denied</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="#64748b">
                        The meeting host declined your request to join this meeting room.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="contained" onClick={() => navigate('/home')} sx={{ backgroundColor: '#2563eb', fontWeight: 700 }}>
                        Return to Dashboard
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Removed by Host Dialog */}
            <Dialog open={removedByHost} onClose={() => navigate('/home')}>
                <DialogTitle sx={{ fontWeight: 800, color: '#dc2626' }}>Meeting Ended</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="#64748b">
                        You have been removed from the meeting by the host.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="contained" onClick={() => navigate('/home')} sx={{ backgroundColor: '#2563eb', fontWeight: 700 }}>
                        Return to Dashboard
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Post-Call Feedback Modal (1-5 Stars) */}
            <Dialog
                open={feedbackModalOpen}
                onClose={handleSkipFeedback}
                PaperProps={{ sx: { borderRadius: '24px', p: 1.5, maxWidth: 440, width: '100%' } }}
            >
                <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pb: 1 }}>
                    How was your call?
                </DialogTitle>
                <DialogContent sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 2.5 }}>
                        Help us improve LiveLink by rating your call quality.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                        <Rating
                            value={feedbackRating}
                            onChange={(_, val) => setFeedbackRating(val || 5)}
                            size="large"
                        />
                    </Box>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Any feedback or issues? (Optional)"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, display: 'flex', gap: 1.5 }}>
                    <Button onClick={handleSkipFeedback} sx={{ color: '#64748b', textTransform: 'none', fontWeight: 600 }}>
                        Skip
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmitFeedback}
                        disabled={feedbackSubmitting}
                        sx={{ backgroundColor: '#2563eb', textTransform: 'none', fontWeight: 700, borderRadius: '10px', px: 3 }}
                    >
                        {feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Room Full Friendly Dialog (Mesh limit of 6) */}
            <Dialog
                open={roomFullDialogOpen}
                onClose={() => navigate('/home')}
                PaperProps={{ sx: { borderRadius: "20px", maxWidth: 440, width: "100%", p: 1.5 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#0f172a", pb: 1 }}>
                    Room Capacity Reached (6/6)
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="#64748b" sx={{ lineHeight: 1.6, fontSize: "0.95rem" }}>
                        This LiveLink meeting has reached its maximum limit of 6 participants. To ensure crystal-clear video quality and low latency in peer-to-peer calls, additional participants cannot join at this time.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={() => navigate('/home')}
                        sx={{ backgroundColor: "#2563eb", fontWeight: 700, textTransform: "none", borderRadius: "12px", py: 1.2, '&:hover': { backgroundColor: "#1d4ed8" } }}
                    >
                        Return to Dashboard
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Meeting Info Modal */}
            <Dialog open={meetingInfoOpen} onClose={() => setMeetingInfoOpen(false)}>
                <DialogTitle sx={{ fontWeight: 800 }}>Meeting Details</DialogTitle>
                <DialogContent>
                    <Typography variant="caption" color="#64748b" fontWeight={700}>ROOM CODE</Typography>
                    <Typography variant="body1" fontWeight={700} sx={{ mb: 2 }}>{url}</Typography>
                    <Typography variant="caption" color="#64748b" fontWeight={700}>INVITE LINK</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', mb: 2 }}>{window.location.href}</Typography>
                    <Button fullWidth variant="contained" startIcon={<WhatsAppIcon />} onClick={shareOnWhatsApp} sx={{ backgroundColor: '#16a34a', fontWeight: 700, mb: 2 }}>
                        Share on WhatsApp
                    </Button>
                    <Box sx={{ pt: 1.5, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" fontWeight={600} color="#0f172a">Meeting Chimes</Typography>
                        <Button
                            size="small"
                            variant={soundEnabled ? "contained" : "outlined"}
                            onClick={() => {
                                const nextState = !soundEnabled;
                                setSoundEnabled(nextState);
                                isSoundChimeActive = nextState;
                                localStorage.setItem("livelink_pref_chimes", nextState ? "true" : "false");
                            }}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            {soundEnabled ? "Enabled" : "Muted"}
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setMeetingInfoOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* In-Call Audio & Video Settings Dialog */}
            <Dialog 
                open={deviceSettingsOpen} 
                onClose={() => setDeviceSettingsOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Audio & Video Settings
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                        <FormControl size="small" fullWidth>
                            <InputLabel id="incall-camera-select-label">Camera</InputLabel>
                            <Select
                                labelId="incall-camera-select-label"
                                value={selectedCamera}
                                label="Camera"
                                onChange={(e) => switchCamera(e.target.value)}
                            >
                                {videoDevices.map((d, idx) => (
                                    <MenuItem key={d.deviceId || idx} value={d.deviceId}>
                                        {d.label || `Camera ${idx + 1}`}
                                    </MenuItem>
                                ))}
                                {videoDevices.length === 0 && <MenuItem value="">Default Camera</MenuItem>}
                            </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth>
                            <InputLabel id="incall-mic-select-label">Microphone</InputLabel>
                            <Select
                                labelId="incall-mic-select-label"
                                value={selectedMicrophone}
                                label="Microphone"
                                onChange={(e) => switchMicrophone(e.target.value)}
                            >
                                {audioInputDevices.map((d, idx) => (
                                    <MenuItem key={d.deviceId || idx} value={d.deviceId}>
                                        {d.label || `Microphone ${idx + 1}`}
                                    </MenuItem>
                                ))}
                                {audioInputDevices.length === 0 && <MenuItem value="">Default Microphone</MenuItem>}
                            </Select>
                        </FormControl>

                        <FormControl size="small" fullWidth>
                            <InputLabel id="incall-speaker-select-label">Speaker</InputLabel>
                            <Select
                                labelId="incall-speaker-select-label"
                                value={selectedSpeaker}
                                label="Speaker"
                                onChange={(e) => switchSpeaker(e.target.value)}
                            >
                                {audioOutputDevices.map((d, idx) => (
                                    <MenuItem key={d.deviceId || idx} value={d.deviceId}>
                                        {d.label || `Speaker ${idx + 1}`}
                                    </MenuItem>
                                ))}
                                {audioOutputDevices.length === 0 && <MenuItem value="">Default Speaker</MenuItem>}
                            </Select>
                        </FormControl>

                        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                            <Button
                                variant="outlined"
                                startIcon={<VolumeUpIcon />}
                                onClick={handleTestSpeaker}
                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '12px' }}
                            >
                                Test speaker
                            </Button>
                            <Button
                                variant={isBackgroundBlur ? "contained" : "outlined"}
                                startIcon={isBackgroundBlur ? <BlurOnIcon /> : <BlurOffIcon />}
                                onClick={handleToggleBlur}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    borderRadius: '12px',
                                    backgroundColor: isBackgroundBlur ? '#2563eb' : undefined
                                }}
                            >
                                {isBackgroundBlur ? "Background Blur: On" : "Background Blur: Off"}
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button 
                        variant="contained" 
                        onClick={() => setDeviceSettingsOpen(false)}
                        sx={{ backgroundColor: '#2563eb', textTransform: 'none', borderRadius: '12px', fontWeight: 700 }}
                    >
                        Done
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Duplicate Tab Warning Dialog */}
            <Dialog 
                open={duplicateTabDetected} 
                onClose={() => setDuplicateTabDetected(false)}
                PaperProps={{ sx: { borderRadius: '20px', p: 1, maxWidth: 440, width: '100%' } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: '#dc2626' }}>
                    ⚠️ Duplicate Tab Warning
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6, fontSize: '0.95rem' }}>
                        This meeting room is already active in another browser tab or window. Having multiple tabs connected to the same meeting can cause audio echo, microphone feedback, and camera connection conflicts.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, display: 'flex', gap: 1 }}>
                    <Button 
                        onClick={() => setDuplicateTabDetected(false)} 
                        sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}
                    >
                        Dismiss
                    </Button>
                    <Button 
                        variant="contained" 
                        color="error" 
                        onClick={() => { cleanUpSession(); navigate('/home'); }}
                        sx={{ textTransform: 'none', borderRadius: '12px', fontWeight: 700 }}
                    >
                        Leave This Tab
                    </Button>
                </DialogActions>
            </Dialog>

            {/* In-Call Toast Notification */}
            <Snackbar
                open={toastOpen}
                autoHideDuration={3500}
                onClose={() => setToastOpen(false)}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity="info" onClose={() => setToastOpen(false)} sx={{ borderRadius: "10px" }}>
                    {toastMsg}
                </Alert>
            </Snackbar>
        </Box>
    );
}