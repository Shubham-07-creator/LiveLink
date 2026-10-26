import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { Box, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button, Chip, useMediaQuery } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import server from '../environment';
import { AuthContext } from '../contexts/AuthContext';
import useMedia from '../hooks/useMedia';
import usePeers from '../hooks/usePeers';
import useSignaling from '../hooks/useSignaling';
import useStats from '../hooks/useStats';
import useHotkeys from '../hooks/useHotkeys';

import Lobby from '../components/video/Lobby';
import Stage from '../components/video/Stage';
import ControlDock from '../components/video/ControlDock';
import ChatDrawer from '../components/video/ChatDrawer';
import PeopleDrawer from '../components/video/PeopleDrawer';
import ReconnectingBanner from '../components/video/ReconnectingBanner';
import DeviceSettingsModal from '../components/video/DeviceSettingsModal';
import WaitingRoomModal from '../components/video/WaitingRoomModal';
import CaptionsOverlay from '../components/video/CaptionsOverlay';
import FeedbackModal from '../components/video/FeedbackModal';
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

    const media = useMedia({ onTrackReplaced: (kind, track) => peers.replaceTrackOnPeers(kind, track) });

    const signaling = useSignaling({
        roomUrl: url, userData,
        onSignalReceived: (senderId, data) => peers.handleSignal(senderId, data),
        onUserJoined: (id, clients, namesMap, avatarsMap) => {
            clients.forEach(cId => {
                if (cId !== signaling.socketId) peers.createPeer(cId, { name: namesMap?.[cId], avatar: avatarsMap?.[cId] });
            });
        },
        onUserLeft: (leftId) => peers.closePeer(leftId),
        onForceMute: () => {
            if (media.audioEnabled) media.toggleAudio();
            setToast({ open: true, message: "You were muted by the meeting host.", severity: 'warning' });
        },
        onUserRemoved: (msg) => {
            peers.closeAllPeers();
            media.stopAudioVisualizer();
            navigate('/', { state: { toast: msg } });
        },
        onRoomFull: (info) => setRoomFullInfo(info)
    });

    const peers = usePeers({ sendSignal: signaling.sendSignal, localStream: media.localStream, myId: signaling.socketId });
    const stats = useStats({ peersRef: peers.peersRef, isCallActive: isInMeeting });

    // Global Hotkeys Hook (M, V, H, C, Esc)
    useHotkeys({
        onToggleAudio: media.toggleAudio,
        onToggleVideo: media.toggleVideo,
        onToggleHand: () => signaling.toggleRaiseHand(displayName),
        onToggleChat: () => setChatOpen(prev => !prev),
        onCloseModals: () => {
            setChatOpen(false);
            setPeopleOpen(false);
            setSettingsOpen(false);
            setLeaveConfirmOpen(false);
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
        axios.get(`${server}/api/v1/users/ice_servers`, { withCredentials: true })
            .then(res => { if (res.data?.iceServers?.length) peers.setIceServers(res.data.iceServers); })
            .catch(() => {});
        media.initMedia();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (isInMeeting) return;
        const previewSocket = io.connect(server, { secure: false });
        previewSocket.emit("get-room-info", url);
        previewSocket.on("room-info", (data) => {
            if (data?.participants) setLobbyParticipants(data.participants);
        });
        return () => {
            try { previewSocket.disconnect(); } catch (e) {}
        };
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
        rec.continuous = true;
        rec.interimResults = true;
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
                setToast({ open: true, message: "Recording started. Video will be saved on your device.", severity: 'info' });
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

    const participantList = [
        { socketId: signaling.socketId, name: displayName, isLocal: true, isHost: signaling.isHost, isHandRaised: signaling.isHandRaised, avatar: userData?.avatar },
        ...peers.remoteVideos.map(r => ({ socketId: r.socketId, name: r.name, isLocal: false, isHost: r.socketId === signaling.hostSocketId, isHandRaised: Boolean(signaling.raisedHands[r.socketId]), avatar: r.avatar }))
    ];

    return (
        <Box sx={{ width: '100vw', height: '100vh', bgcolor: '#090d16', color: 'white', position: 'relative', overflow: 'hidden' }}>
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
                    {(isRecording || signaling.remoteRecording.isRecording) && (
                        <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 35 }}>
                            <Chip icon={<FiberManualRecordIcon sx={{ color: '#ef4444 !important' }} />}
                                label="REC (Saved on device)" size="small"
                                sx={{ bgcolor: 'rgba(0,0,0,0.75)', color: 'white', fontWeight: 700, backdropFilter: 'blur(4px)' }} />
                        </Box>
                    )}
                    <Stage localStream={media.localStream} screenStream={media.screenStream} isScreenSharing={media.isScreenSharing}
                        remoteVideos={peers.remoteVideos} localName={displayName} localAvatar={userData?.avatar}
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
                        onOpenSettings={() => setSettingsOpen(true)} onLeaveCall={() => setLeaveConfirmOpen(true)} />

                    {/* Dedicated Chat and People Drawers */}
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
                </>
            )}

            {/* Leave Meeting Confirmation Dialog */}
            <Dialog open={leaveConfirmOpen} onClose={() => setLeaveConfirmOpen(false)} PaperProps={{ sx: { bgcolor: '#0f172a', color: 'white', borderRadius: '20px', p: 1.5, maxWidth: 380 } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>Leave Meeting?</DialogTitle>
                <DialogContent sx={{ color: '#94a3b8' }}>Are you sure you want to exit this call?</DialogContent>
                <DialogActions sx={{ gap: 1, pr: 2, pb: 1.5 }}>
                    <Button onClick={() => setLeaveConfirmOpen(false)} sx={{ color: '#94a3b8' }}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={confirmLeave} sx={{ borderRadius: '12px' }}>Leave Call</Button>
                </DialogActions>
            </Dialog>

            <FeedbackModal open={feedbackOpen} onSubmit={(d) => axios.post(`${server}/api/v1/users/feedback`, { meetingCode: url, ...d }, { withCredentials: true })} onClose={() => navigate('/')} />
            <Dialog open={Boolean(roomFullInfo)} PaperProps={{ sx: { bgcolor: '#0f172a', color: 'white', borderRadius: '20px', p: 1.5 } }}>
                <DialogTitle sx={{ fontWeight: 800 }}>Room Capacity Reached</DialogTitle>
                <DialogContent sx={{ color: '#94a3b8' }}>{roomFullInfo?.message || "This room has reached the maximum of 4 participants for peer-to-peer mesh calling."}</DialogContent>
                <DialogActions><Button variant="contained" onClick={() => navigate('/')} sx={{ borderRadius: '12px' }}>Return to Home</Button></DialogActions>
            </Dialog>

            <Snackbar open={media.showMutedHint} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} autoHideDuration={3000}><Alert severity="info" sx={{ borderRadius: '12px', bgcolor: '#1e293b', color: 'white' }}>You are speaking while muted.</Alert></Snackbar>
            <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(t => ({ ...t, open: false }))}><Alert severity={toast.severity} sx={{ borderRadius: '12px' }}>{toast.message}</Alert></Snackbar>
            <Snackbar open={duplicateTab} autoHideDuration={6000}><Alert severity="warning" sx={{ borderRadius: '12px' }}>You have this meeting open in another tab.</Alert></Snackbar>
        </Box>
    );
}
