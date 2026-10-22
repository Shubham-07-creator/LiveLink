import React, { useRef, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    AvatarGroup,
    Avatar,
    IconButton,
    Tooltip
} from '@mui/material';

// Icons
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { playChime, getInitials, getAvatarColor } from '../../utils/audioChimes';

export default function Lobby({
    localStream,
    username,
    onUsernameChange,
    videoEnabled,
    audioEnabled,
    permissionDenied,
    audioVolume = 0,
    videoDevices = [],
    audioInputDevices = [],
    audioOutputDevices = [],
    selectedCamera,
    selectedMicrophone,
    selectedSpeaker,
    lobbyParticipants = [],
    onToggleVideo,
    onToggleAudio,
    onSwitchCamera,
    onSwitchMicrophone,
    onSwitchSpeaker,
    onJoinWithoutMedia,
    onJoinMeeting
}) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    const handleTestSpeaker = () => {
        playChime('beep');
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: '#090d16',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 2, sm: 4 }
            }}
        >
            <Paper
                elevation={10}
                sx={{
                    width: '100%',
                    maxWidth: 820,
                    borderRadius: '24px',
                    bgcolor: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.08)',
                    p: { xs: 2.5, sm: 4 },
                    color: 'white'
                }}
            >
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, textAlign: 'center' }}>
                    Ready to join LiveLink?
                </Typography>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', mb: 3 }}>
                    Configure your audio and camera before entering the room.
                </Typography>

                {/* Permission Denied Friendly Banner */}
                {permissionDenied && (
                    <Alert
                        severity="warning"
                        sx={{ mb: 3, borderRadius: '14px', bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#fef3c7' }}
                        action={
                            <Button color="inherit" size="small" onClick={onJoinWithoutMedia}>
                                Join without camera/mic
                            </Button>
                        }
                    >
                        Camera or microphone access was denied. You can still join as a viewer.
                    </Alert>
                )}

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, gap: 3.5, alignItems: 'start' }}>
                    {/* Left: Video Preview & Mic Meter */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box
                            sx={{
                                position: 'relative',
                                width: '100%',
                                aspectRatio: '16/9',
                                borderRadius: '16px',
                                bgcolor: '#000',
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    transform: 'scaleX(-1)',
                                    display: videoEnabled ? 'block' : 'none'
                                }}
                            />
                            {!videoEnabled && (
                                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Avatar sx={{ width: 72, height: 72, bgcolor: getAvatarColor(username), fontSize: '1.8rem', fontWeight: 700 }}>
                                        {getInitials(username || 'You')}
                                    </Avatar>
                                </Box>
                            )}

                            {/* Floating Toggles on Preview */}
                            <Box sx={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 1.5 }}>
                                <Tooltip title={audioEnabled ? "Mute mic" : "Unmute mic"}>
                                    <IconButton
                                        onClick={onToggleAudio}
                                        sx={{ bgcolor: audioEnabled ? 'rgba(0,0,0,0.6)' : '#ef4444', color: 'white', '&:hover': { bgcolor: audioEnabled ? 'rgba(0,0,0,0.85)' : '#dc2626' } }}
                                    >
                                        {audioEnabled ? <MicIcon /> : <MicOffIcon />}
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={videoEnabled ? "Turn off camera" : "Turn on camera"}>
                                    <IconButton
                                        onClick={onToggleVideo}
                                        sx={{ bgcolor: videoEnabled ? 'rgba(0,0,0,0.6)' : '#ef4444', color: 'white', '&:hover': { bgcolor: videoEnabled ? 'rgba(0,0,0,0.85)' : '#dc2626' } }}
                                    >
                                        {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>

                        {/* Live Mic Volume Level Meter */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1 }}>
                            <MicIcon sx={{ fontSize: '1.1rem', color: audioEnabled ? '#10b981' : '#ef4444' }} />
                            <Box sx={{ flex: 1, height: 6, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                                <Box
                                    sx={{
                                        width: `${audioEnabled ? audioVolume : 0}%`,
                                        height: '100%',
                                        bgcolor: '#10b981',
                                        transition: 'width 0.1s ease'
                                    }}
                                />
                            </Box>
                        </Box>
                    </Box>

                    {/* Right: Device Dropdowns & Join Form */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Display Name Input */}
                        <TextField
                            fullWidth
                            size="small"
                            label="Your Display Name"
                            value={username}
                            onChange={(e) => onUsernameChange(e.target.value)}
                            sx={{ '& .MuiOutlinedInput-root': { color: 'white', bgcolor: '#1e293b', borderRadius: '12px' } }}
                        />

                        {/* Camera Selector */}
                        {videoDevices.length > 0 && (
                            <FormControl fullWidth size="small">
                                <InputLabel sx={{ color: '#94a3b8' }}>Camera</InputLabel>
                                <Select
                                    value={selectedCamera || videoDevices[0]?.deviceId || ''}
                                    onChange={(e) => onSwitchCamera(e.target.value)}
                                    label="Camera"
                                    sx={{ color: 'white', bgcolor: '#1e293b', borderRadius: '12px' }}
                                >
                                    {videoDevices.map(d => (
                                        <MenuItem key={d.deviceId} value={d.deviceId}>
                                            {d.label || `Camera (${d.deviceId.slice(0, 6)}...)`}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {/* Microphone Selector */}
                        {audioInputDevices.length > 0 && (
                            <FormControl fullWidth size="small">
                                <InputLabel sx={{ color: '#94a3b8' }}>Microphone</InputLabel>
                                <Select
                                    value={selectedMicrophone || audioInputDevices[0]?.deviceId || ''}
                                    onChange={(e) => onSwitchMicrophone(e.target.value)}
                                    label="Microphone"
                                    sx={{ color: 'white', bgcolor: '#1e293b', borderRadius: '12px' }}
                                >
                                    {audioInputDevices.map(d => (
                                        <MenuItem key={d.deviceId} value={d.deviceId}>
                                            {d.label || `Mic (${d.deviceId.slice(0, 6)}...)`}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {/* Speaker Selector & Test Button */}
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {audioOutputDevices.length > 0 && (
                                <FormControl fullWidth size="small">
                                    <InputLabel sx={{ color: '#94a3b8' }}>Speaker</InputLabel>
                                    <Select
                                        value={selectedSpeaker || audioOutputDevices[0]?.deviceId || ''}
                                        onChange={(e) => onSwitchSpeaker(e.target.value)}
                                        label="Speaker"
                                        sx={{ color: 'white', bgcolor: '#1e293b', borderRadius: '12px' }}
                                    >
                                        {audioOutputDevices.map(d => (
                                            <MenuItem key={d.deviceId} value={d.deviceId}>
                                                {d.label || `Speaker (${d.deviceId.slice(0, 6)}...)`}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                            <Button
                                variant="outlined"
                                startIcon={<VolumeUpIcon />}
                                onClick={handleTestSpeaker}
                                sx={{ borderRadius: '12px', whiteSpace: 'nowrap', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}
                            >
                                Test
                            </Button>
                        </Box>

                        {/* Who's in the room */}
                        {lobbyParticipants.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
                                <AvatarGroup max={4}>
                                    {lobbyParticipants.map((p, i) => (
                                        <Avatar key={i} src={p.avatar} sx={{ width: 28, height: 28, bgcolor: getAvatarColor(p.name), fontSize: '0.75rem' }}>
                                            {getInitials(p.name)}
                                        </Avatar>
                                    ))}
                                </AvatarGroup>
                                <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                    {lobbyParticipants.length} {lobbyParticipants.length === 1 ? 'person' : 'people'} already in call
                                </Typography>
                            </Box>
                        )}

                        {/* Join Button */}
                        <Button
                            variant="contained"
                            size="large"
                            onClick={onJoinMeeting}
                            disabled={!username?.trim()}
                            sx={{ mt: 1, py: 1.5, borderRadius: '14px', fontWeight: 700, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
                        >
                            Join Meeting Now
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
}
