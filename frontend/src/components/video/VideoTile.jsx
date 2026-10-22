import React, { useRef, useEffect } from 'react';
import { Box, Typography, Chip, IconButton, Tooltip, Avatar } from '@mui/material';
import MicOffIcon from '@mui/icons-material/MicOff';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt';
import PanToolIcon from '@mui/icons-material/PanTool';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import { getInitials, getAvatarColor } from '../../utils/audioChimes';

export default function VideoTile({
    stream,
    name,
    avatar,
    isLocal,
    isMuted,
    isVideoOff,
    isSpeaking,
    isPinned,
    isSpotlighted,
    isHandRaised,
    networkQuality, // 'Good' | 'Weak' | 'Poor'
    onPin,
    onSpotlight
}) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    const handlePiP = async (e) => {
        e.stopPropagation();
        if (videoRef.current && document.pictureInPictureEnabled) {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else {
                    await videoRef.current.requestPictureInPicture();
                }
            } catch (err) {
                console.warn("PiP error:", err);
            }
        }
    };

    const getQualityColor = () => {
        if (networkQuality === 'Poor') return '#ef4444';
        if (networkQuality === 'Weak') return '#f59e0b';
        return '#10b981';
    };

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                borderRadius: '16px',
                overflow: 'hidden',
                backgroundColor: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isSpeaking ? '2.5px solid #22c55e' : (isSpotlighted ? '2.5px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)'),
                boxShadow: isSpeaking ? '0 0 16px rgba(34, 197, 94, 0.45)' : 'none',
                transition: 'border 0.2s ease, box-shadow 0.2s ease'
            }}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: isLocal ? 'scaleX(-1)' : 'none',
                    display: isVideoOff ? 'none' : 'block'
                }}
            />

            {/* Initials Avatar fallback when camera is off */}
            {isVideoOff && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Avatar
                        src={avatar || undefined}
                        sx={{
                            width: 80,
                            height: 80,
                            bgcolor: getAvatarColor(name),
                            fontSize: '2rem',
                            fontWeight: 700,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                        }}
                    >
                        {getInitials(name)}
                    </Avatar>
                    <Typography sx={{ color: 'white', mt: 1.5, fontWeight: 600, fontSize: '0.95rem' }}>
                        {name} {isLocal && '(You)'}
                    </Typography>
                </Box>
            )}

            {/* Top Left: Badges (Hand raised, Network Quality) */}
            <Box sx={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 1, zIndex: 5 }}>
                {isHandRaised && (
                    <Chip
                        icon={<PanToolIcon sx={{ color: '#f59e0b !important', fontSize: '1rem' }} />}
                        label="Hand Raised"
                        size="small"
                        sx={{ bgcolor: 'rgba(0,0,0,0.7)', color: 'white', fontWeight: 600, backdropFilter: 'blur(4px)' }}
                    />
                )}
                {networkQuality && (
                    <Tooltip title={`Network Quality: ${networkQuality}`}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                px: 1,
                                py: 0.25,
                                borderRadius: '12px',
                                bgcolor: 'rgba(0,0,0,0.65)',
                                backdropFilter: 'blur(4px)',
                                color: getQualityColor(),
                                fontSize: '0.75rem',
                                fontWeight: 700
                            }}
                        >
                            <SignalCellularAltIcon sx={{ fontSize: '0.9rem' }} />
                            <span>{networkQuality}</span>
                        </Box>
                    </Tooltip>
                )}
            </Box>

            {/* Top Right: Pin & PiP Action Buttons */}
            <Box sx={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 0.5, zIndex: 5 }}>
                {onPin && (
                    <Tooltip title={isPinned ? "Unpin participant" : "Pin participant"}>
                        <IconButton
                            size="small"
                            onClick={onPin}
                            sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: isPinned ? '#2563eb' : 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' } }}
                            aria-label="Pin video"
                        >
                            {isPinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                )}
                {document.pictureInPictureEnabled && !isVideoOff && (
                    <Tooltip title="Picture in Picture">
                        <IconButton
                            size="small"
                            onClick={handlePiP}
                            sx={{ bgcolor: 'rgba(0,0,0,0.6)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' } }}
                            aria-label="Picture in picture"
                        >
                            <PictureInPictureAltIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            {/* Bottom Left: Participant Name & Mute Icon */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.8,
                    bgcolor: 'rgba(0,0,0,0.65)',
                    px: 1.25,
                    py: 0.4,
                    borderRadius: '8px',
                    backdropFilter: 'blur(4px)',
                    zIndex: 5
                }}
            >
                <Typography sx={{ color: 'white', fontSize: '0.82rem', fontWeight: 600 }}>
                    {name} {isLocal && '(You)'}
                </Typography>
                {isMuted && (
                    <MicOffIcon sx={{ color: '#ef4444', fontSize: '0.95rem' }} />
                )}
            </Box>
        </Box>
    );
}
