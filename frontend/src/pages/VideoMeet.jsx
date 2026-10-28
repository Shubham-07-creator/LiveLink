import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { Box, useMediaQuery } from '@mui/material';

import server from '../environment';
import { AuthContext } from '../contexts/AuthContext';
import useMedia from '../hooks/useMedia';
import usePeers from '../hooks/usePeers';
import useSignaling from '../hooks/useSignaling';
import useStats from '../hooks/useStats';
import useHotkeys from '../hooks/useHotkeys';

import Lobby from '../components/video/Lobby';
import Stage from '../components/video/Stage';
import TopBar from '../components/video/TopBar';
import KeyboardShortcutsModal from '../components/video/KeyboardShortcutsModal';
import ControlDock from '../components/video/ControlDock';
import ChatDrawer from '../components/video/ChatDrawer';
import PeopleDrawer from '../components/video/PeopleDrawer';
import FloatingReactions from '../components/video/FloatingReactions';
import ReconnectingBanner from '../components/video/ReconnectingBanner';
import DeviceSettingsModal from '../components/video/DeviceSettingsModal';
import WaitingRoomModal from '../components/video/WaitingRoomModal';
import CaptionsOverlay from '../components/video/CaptionsOverlay';
import FeedbackModal from '../components/video/FeedbackModal';
import { Button, Modal, Toast } from '../components/ui';
import { MeetingRecorder } from '../utils/meetingRecorder';

export default function VideoMeet() {
    const { url } = useParams();
    const navigate = useNavigate();
    const { userData } = useContext(AuthContext);
    const isMobile = useMediaQuery('(max-width:600px)');

    const [isInMeeting, setIsInMeeting] = useState(false);
    const [displayName, setDisplayName] = useState(userData?.name || userData?.username || '');
    const [viewMode, setViewMode] = useState('grid');
    const [pinnedUser, setPinnedUser] = useState(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [peopleOpen, setPeopleOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [callDuration, setCallDuration] = useState(0);

    const [lobbyParticipants, setLobbyParticipants] = useState([]);
    const [roomFullInfo, setRoomFullInfo] = useState(null);
    const [duplicateTab, setDuplicateTab] = useState(false);
    const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

    const recorderRef = useRef(new MeetingRecorder());
    const [isRecording, setIsRecording] = useState(false);
    const [captionsActive, setCaptionsActive] = useState(false);
    const [captionText, setCaptionText] = useState('');
    const recognitionRef = useRef(null);
    const callStartTimeRef = useRef(null);
    const peersRef = useRef(null);

    const media = useMedia({ onTrackReplaced: (kind, track) => peersRef.current?.replaceTrackOnPeers(kind, track) });

    const signaling = useSignaling({
        roomUrl: url,
        userData,
        onSignalReceived: (senderId, data) => peersRef.current?.handleSignal(senderId, data),
        onUserJoined: (joinedId, clients, namesMap, avatarsMap, roomHost, myId) => {
            const currentMyId = myId || signaling.socketIdRef?.current || signaling.socketId;

            // Strict mesh rule: Never connect to oneself
            clients.forEach(cId => {
                if (!cId || cId === currentMyId) return;

                // Asymmetric offer initiation:
                // Existing participants in the room initiate connection to newly joined participants.
                if (joinedId !== currentMyId && cId === joinedId) {
                    peersRef.current?.createPeer(cId, { name: namesMap?.[cId], avatar: avatarsMap?.[cId] });
                }
            });

            // Reliable Fallback for newly joined user: If after 2.5s no offer has arrived from an existing participant,
            // initiate as fallback to ensure 100% connection reliability.
            if (joinedId === currentMyId) {
                clients.forEach(cId => {
                    if (!cId || cId === currentMyId) return;
                    setTimeout(() => {
                        if (peersRef.current && !peersRef.current.peersRef.current[cId]) {
                            peersRef.current.createPeer(cId, { name: namesMap?.[cId], avatar: avatarsMap?.[cId] });
                        }
                    }, 2500);
                });
            }
        },
        onUserLeft: (leftId) => peersRef.current?.closePeer(leftId),
        onForceMute: () => {
            if (media.audioEnabled) media.toggleAudio();
            setToast({ open: true, message: "You were muted by the meeting host.", severity: 'warning' });
        },
        onUserRemoved: (msg) => {
            peersRef.current?.closeAllPeers();
            media.stopAudioVisualizer();
            navigate('/', { state: { toast: msg } });
        },
        onRoomFull: (info) => setRoomFullInfo(info)
    });

    const peers = usePeers({
        sendSignal: signaling.sendSignal,
        localStream: media.localStream,
        myId: signaling.socketIdRef?.current || signaling.socketId
    });
    peersRef.current = peers;
    const stats = useStats({ peersRef: peers.peersRef, isCallActive: isInMeeting });

    useHotkeys({
        onToggleAudio: media.toggleAudio,
        onToggleVideo: media.toggleVideo,
        onToggleScreenShare: () => media.isScreenSharing ? media.stopScreenShare() : media.startScreenShare(),
        onToggleHand: () => signaling.toggleRaiseHand(displayName),
        onToggleChat: () => setChatOpen(prev => !prev),
        onTogglePeople: () => setPeopleOpen(prev => !prev),
        onToggleHelp: () => setShortcutsOpen(prev => !prev),
        onCloseModals: () => {
            setChatOpen(false); setPeopleOpen(false); setSettingsOpen(false); setLeaveConfirmOpen(false); setShortcutsOpen(false);
        },
        enabled: isInMeeting
    });

    useEffect(() => { if (media.isScreenSharing) setViewMode('speaker'); }, [media.isScreenSharing]);

    useEffect(() => {
        if (!isInMeeting) return;
        peers.applyAdaptiveQuality({
            participantCount: peers.remoteVideos.length + 1,
            isLocalSpeaker: media.audioVolume > 15 && media.audioEnabled,
            isScreenSharing: media.isScreenSharing,
            isMobile,
            qualityTier: stats.overallQuality
        });
    }, [isInMeeting, peers.remoteVideos.length, media.audioVolume, media.audioEnabled, media.isScreenSharing, isMobile, stats.overallQuality, peers]);

    useEffect(() => {
        try {
            const cachedIce = sessionStorage.getItem("livelink_ice_servers");
            if (cachedIce) {
                const parsed = JSON.parse(cachedIce);
                if (Array.isArray(parsed) && parsed.length) peers.setIceServers(parsed);
            }
        } catch (e) {}

        axios.get(`${server}/api/v1/users/ice_servers`, { withCredentials: true })
            .then(res => {
                if (res.data?.iceServers?.length) {
                    peers.setIceServers(res.data.iceServers);
                    try { sessionStorage.setItem("livelink_ice_servers", JSON.stringify(res.data.iceServers)); } catch (e) {}
                }
            })
            .catch(() => {});
        media.initMedia();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Call duration timer
    useEffect(() => {
        if (!isInMeeting) return;
        const interval = setInterval(() => {
            if (callStartTimeRef.current) {
                setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isInMeeting]);

    useEffect(() => {
        if (isInMeeting) return;
        const isSecure = server.startsWith("https");
        const previewSocket = io.connect(server, {
            secure: isSecure,
            withCredentials: true,
            transports: ['websocket', 'polling']
        });
        previewSocket.emit("get-room-info", url);
        previewSocket.on("room-info", (data) => {
            if (data?.participants) setLobbyParticipants(data.participants);
        });
        return () => { try { previewSocket.disconnect(); } catch (e) {} };
    }, [url, isInMeeting]);

    useEffect(() => {
        if (!window.BroadcastChannel) return;
        const channel = new BroadcastChannel(`livelink_active_${url}`);
        channel.onmessage = (e) => {
            if (e.data === 'ping') channel.postMessage('pong');
            else if (e.data === 'pong') setDuplicateTab(true);
        };
        channel.postMessage('ping');
        return () => channel.close();
    }, [url]);

    const toggleCaptions = useCallback(() => {
        if (captionsActive) {
            recognitionRef.current?.stop();
            setCaptionsActive(false);
            setCaptionText('');
            return;
        }
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            setToast({ open: true, message: "Captions are only supported in Chromium browsers.", severity: 'warning' });
            return;
        }
        const rec = new SpeechRec();
        rec.continuous = true; rec.interimResults = true;
        rec.onresult = (e) => setCaptionText(Array.from(e.results).map(r => r[0].transcript).join(''));
        rec.onerror = () => setCaptionsActive(false);
        rec.start();
        recognitionRef.current = rec;
        setCaptionsActive(true);
    }, [captionsActive]);

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            recorderRef.current.stopRecording();
            setIsRecording(false);
            signaling.notifyRecordingStopped();
            setToast({ open: true, message: "Recording saved to your device.", severity: 'success' });
        } else {
            const started = recorderRef.current.startRecording(media.localStream, peers.remoteVideos);
            if (started) {
                setIsRecording(true);
                signaling.notifyRecordingStarted(displayName);
                setToast({ open: true, message: "Recording started. Saved on your device.", severity: 'info' });
            }
        }
    }, [isRecording, media.localStream, peers.remoteVideos, displayName, signaling]);

    const handleJoin = () => {
        callStartTimeRef.current = Date.now();
        setIsInMeeting(true);
        signaling.connect(displayName);
    };

    const confirmLeave = async () => {
        setLeaveConfirmOpen(false);
        if (isRecording) toggleRecording();
        const durationSec = callStartTimeRef.current ? Math.round((Date.now() - callStartTimeRef.current) / 1000) : 0;
        try {
            await axios.post(`${server}/api/v1/users/add_to_activity`, {
                meeting_code: url, duration: durationSec, participantCount: peers.remoteVideos.length + 1
            }, { withCredentials: true });
        } catch (e) {}
        peers.closeAllPeers();
        signaling.disconnect();
        setFeedbackOpen(true);
    };

    const currentLocalSocketId = signaling.socketIdRef?.current || signaling.socketId;

    const participantList = [
        { socketId: currentLocalSocketId, name: displayName, isLocal: true, isHost: signaling.isHost, isHandRaised: signaling.isHandRaised, avatar: userData?.avatar },
        ...peers.remoteVideos
            .filter(r => r.socketId !== currentLocalSocketId)
            .map(r => ({ socketId: r.socketId, name: r.name, isLocal: false, isHost: r.socketId === signaling.hostSocketId, isHandRaised: Boolean(signaling.raisedHands[r.socketId]), avatar: r.avatar }))
    ];

    return (
        <Box sx={{ width: '100vw', height: { xs: '100dvh', sm: '100vh' }, bgcolor: '#090d16', color: 'white', position: 'relative', overflow: 'hidden' }}>
            {!isInMeeting ? (
                <Lobby localStream={media.localStream} username={displayName} onUsernameChange={setDisplayName}
                    videoEnabled={media.videoEnabled} audioEnabled={media.audioEnabled} permissionDenied={media.permissionDenied}
                    audioVolume={media.audioVolume} videoDevices={media.videoDevices} audioInputDevices={media.audioInputDevices}
                    audioOutputDevices={media.audioOutputDevices} selectedCamera={media.selectedCamera}
                    selectedMicrophone={media.selectedMicrophone} selectedSpeaker={media.selectedSpeaker}
                    lobbyParticipants={lobbyParticipants}
                    onToggleVideo={media.toggleVideo} onToggleAudio={media.toggleAudio} onSwitchCamera={media.switchCamera}
                    onSwitchMicrophone={media.switchMicrophone} onSwitchSpeaker={media.switchSpeaker}
                    onJoinWithoutMedia={media.joinWithoutMedia} onJoinMeeting={handleJoin} />
            ) : (
                <>
                    <TopBar roomCode={url} duration={callDuration} participantCount={participantList.length}
                        isRecording={isRecording || signaling.remoteRecording.isRecording} isVisible={controlsVisible}
                        onCopyLink={() => { navigator.clipboard.writeText(window.location.href); setToast({ open: true, message: "Meeting link copied", severity: 'success' }); }}
                        onTogglePeople={() => setPeopleOpen(d => !d)}
                        onToggleHelp={() => setShortcutsOpen(s => !s)} />

                    <Stage localStream={media.localStream} screenStream={media.screenStream} isScreenSharing={media.isScreenSharing}
                        remoteVideos={peers.remoteVideos} localName={displayName} localAvatar={userData?.avatar}
                        localSocketId={currentLocalSocketId}
                        videoEnabled={media.videoEnabled} audioEnabled={media.audioEnabled} localSpeaking={media.audioVolume > 15 && media.audioEnabled}
                        activeSpeakingPeers={stats.activeSpeakingPeers} peerQualities={stats.peerQualities} overallQuality={stats.overallQuality}
                        raisedHands={signaling.raisedHands} isLocalHandRaised={signaling.isHandRaised} viewMode={viewMode}
                        pinnedUser={pinnedUser} spotlightUser={signaling.spotlightUser} onPinUser={setPinnedUser} onSpotlightUser={signaling.spotlightParticipant} />

                    <ControlDock videoEnabled={media.videoEnabled} audioEnabled={media.audioEnabled} isScreenSharing={media.isScreenSharing}
                        isHandRaised={signaling.isHandRaised} isRecording={isRecording} isHost={signaling.isHost} viewMode={viewMode}
                        captionsActive={captionsActive} unreadMessages={signaling.newMessagesCount} onToggleAudio={media.toggleAudio}
                        onToggleVideo={media.toggleVideo} onToggleScreenShare={() => media.isScreenSharing ? media.stopScreenShare() : media.startScreenShare()}
                        onToggleHand={() => signaling.toggleRaiseHand(displayName)} onSendReaction={(em) => signaling.sendReaction(em, displayName)}
                        onToggleViewMode={() => setViewMode(v => v === 'grid' ? 'speaker' : 'grid')} onToggleCaptions={toggleCaptions}
                        onToggleChat={() => { setChatOpen(d => !d); signaling.setNewMessagesCount(0); }}
                        onTogglePeople={() => setPeopleOpen(d => !d)} onToggleRecording={toggleRecording}
                        onOpenSettings={() => setSettingsOpen(true)} onLeaveCall={() => setLeaveConfirmOpen(true)}
                        onActivity={setControlsVisible} />

                    <FloatingReactions reactions={signaling.reactions} />
                    <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} messages={signaling.messages}
                        typingUser={signaling.typingUser} currentUserId={signaling.socketId}
                        onSendMessage={(txt) => signaling.sendMessage(txt, displayName)} onSendTyping={signaling.sendTyping} />

                    <PeopleDrawer open={peopleOpen} onClose={() => setPeopleOpen(false)} participants={participantList}
                        isHost={signaling.isHost} isRoomLocked={signaling.isRoomLocked} waitingUsers={signaling.waitingUsers}
                        onLockRoom={signaling.lockRoom} onMuteAll={signaling.muteAll} onAdmitUser={signaling.admitUser}
                        onDenyUser={signaling.denyUser} onMuteParticipant={signaling.muteParticipant} onRemoveParticipant={signaling.removeParticipant} />

                    <CaptionsOverlay active={captionsActive} currentTranscript={captionText} />
                    <ReconnectingBanner isReconnecting={peers.isReconnecting} reconnectFailed={peers.reconnectFailed} onRetry={() => window.location.reload()} onLeave={() => navigate('/')} />
                    <WaitingRoomModal isWaiting={signaling.isWaitingForAdmission} isDenied={signaling.admissionDenied} onLeave={() => navigate('/')} />
                    <DeviceSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} videoDevices={media.videoDevices}
                        audioInputDevices={media.audioInputDevices} audioOutputDevices={media.audioOutputDevices} selectedCamera={media.selectedCamera}
                        selectedMicrophone={media.selectedMicrophone} selectedSpeaker={media.selectedSpeaker} onSwitchCamera={media.switchCamera}
                        onSwitchMicrophone={media.switchMicrophone} onSwitchSpeaker={media.switchSpeaker} />
                    <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
                </>
            )}

            {/* Leave Meeting Confirmation Dialog */}
            <Modal open={leaveConfirmOpen} onClose={() => setLeaveConfirmOpen(false)} title="Leave meeting?"
                description="Are you sure you want to disconnect from this call?"
                actions={
                    <>
                        <Button variant="ghost" size="normal" onClick={() => setLeaveConfirmOpen(false)}>Cancel</Button>
                        <Button variant="danger" size="normal" onClick={confirmLeave}>Leave call</Button>
                    </>
                } />

            <FeedbackModal open={feedbackOpen} onSubmit={(d) => axios.post(`${server}/api/v1/users/feedback`, { meetingCode: url, ...d }, { withCredentials: true })} onClose={() => navigate('/')} />

            {/* Room Capacity Reached Modal */}
            <Modal open={Boolean(roomFullInfo)} onClose={() => navigate('/')} title="Room capacity reached"
                description={roomFullInfo?.message || "This room has reached the maximum of 4 participants for peer-to-peer calling."}
                actions={<Button variant="primary" size="normal" onClick={() => navigate('/')}>Return to home</Button>} />

            <Toast open={media.showMutedHint} message="You are speaking while muted" severity="info" />
            <Toast open={toast.open} message={toast.message} severity={toast.severity} onClose={() => setToast(t => ({ ...t, open: false }))} />
            <Toast open={duplicateTab} message="You have this meeting open in another tab" severity="warning" />
        </Box>
    );
}
