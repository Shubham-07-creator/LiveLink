import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, Tooltip, Badge, Menu, MenuItem, ListItemIcon, ListItemText, useMediaQuery } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import PanToolIcon from '@mui/icons-material/PanTool';
import AddReactionIcon from '@mui/icons-material/AddReaction';
import ChatIcon from '@mui/icons-material/Chat';
import GroupsIcon from '@mui/icons-material/Groups';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopIcon from '@mui/icons-material/Stop';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import ClosedCaptionDisabledIcon from '@mui/icons-material/ClosedCaptionDisabled';
import SettingsIcon from '@mui/icons-material/Settings';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function ControlDock({
    videoEnabled, audioEnabled, isScreenSharing, isHandRaised, isRecording, isHost,
    viewMode, captionsActive, unreadMessages = 0, onToggleAudio, onToggleVideo,
    onToggleScreenShare, onToggleHand, onSendReaction, onToggleViewMode, onToggleCaptions,
    onToggleChat, onTogglePeople, onToggleRecording, onOpenSettings, onLeaveCall
}) {
    const isMobile = useMediaQuery('(max-width:600px)');
    const [isVisible, setIsVisible] = useState(true);
    const [reactionAnchor, setReactionAnchor] = useState(null);
    const [moreAnchor, setMoreAnchor] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => {
        if (isMobile) { setIsVisible(true); return; }
        const reset = () => {
            setIsVisible(true);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                if (!reactionAnchor && !moreAnchor) setIsVisible(false);
            }, 3000);
        };
        window.addEventListener('mousemove', reset);
        window.addEventListener('keydown', reset);
        return () => {
            window.removeEventListener('mousemove', reset);
            window.removeEventListener('keydown', reset);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isMobile, reactionAnchor, moreAnchor]);

    const reactions = ['👍', '❤️', '👏', '😂', '🎉'];

    return (
        <Box sx={{
            position: isMobile ? 'fixed' : 'absolute',
            bottom: isMobile ? 0 : 24,
            left: isMobile ? 0 : '50%',
            transform: isMobile ? 'none' : 'translateX(-50%)',
            width: isMobile ? '100%' : 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 1.25, px: 2.5, py: 1.25,
            borderRadius: isMobile ? 0 : '24px',
            bgcolor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            border: isMobile ? 'none' : '1px solid rgba(255,255,255,0.12)',
            borderTop: isMobile ? '1px solid rgba(255,255,255,0.1)' : undefined,
            opacity: isVisible ? 1 : 0, transition: 'opacity 0.25s ease', zIndex: 30
        }}>
            <Tooltip title={audioEnabled ? "Mute Microphone (M)" : "Unmute Microphone (M)"}>
                <IconButton onClick={onToggleAudio} aria-label={audioEnabled ? "Mute mic" : "Unmute mic"}
                    sx={{ bgcolor: audioEnabled ? 'rgba(255,255,255,0.08)' : '#ef4444', color: 'white', minWidth: 44, minHeight: 44 }}>
                    {audioEnabled ? <MicIcon /> : <MicOffIcon />}
                </IconButton>
            </Tooltip>

            <Tooltip title={videoEnabled ? "Turn off camera (V)" : "Turn on camera (V)"}>
                <IconButton onClick={onToggleVideo} aria-label={videoEnabled ? "Turn off camera" : "Turn on camera"}
                    sx={{ bgcolor: videoEnabled ? 'rgba(255,255,255,0.08)' : '#ef4444', color: 'white', minWidth: 44, minHeight: 44 }}>
                    {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                </IconButton>
            </Tooltip>

            {!isMobile && (
                <>
                    <Tooltip title={isScreenSharing ? "Stop sharing screen" : "Share screen"}>
                        <IconButton onClick={onToggleScreenShare} sx={{ bgcolor: isScreenSharing ? '#2563eb' : 'rgba(255,255,255,0.08)', color: 'white', minWidth: 44, minHeight: 44 }}>
                            {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={isHandRaised ? "Lower hand (H)" : "Raise hand (H)"}>
                        <IconButton onClick={onToggleHand} sx={{ bgcolor: isHandRaised ? '#f59e0b' : 'rgba(255,255,255,0.08)', color: 'white', minWidth: 44, minHeight: 44 }}>
                            <PanToolIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Reactions">
                        <IconButton onClick={(e) => setReactionAnchor(e.currentTarget)} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white', minWidth: 44, minHeight: 44 }}>
                            <AddReactionIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={viewMode === 'grid' ? "Speaker View" : "Grid View"}>
                        <IconButton onClick={onToggleViewMode} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white', minWidth: 44, minHeight: 44 }}>
                            {viewMode === 'grid' ? <ViewStreamIcon /> : <GridViewIcon />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Subtitles (Beta, Chrome only)">
                        <IconButton onClick={onToggleCaptions} sx={{ bgcolor: captionsActive ? '#2563eb' : 'rgba(255,255,255,0.08)', color: 'white', minWidth: 44, minHeight: 44 }}>
                            {captionsActive ? <ClosedCaptionIcon /> : <ClosedCaptionDisabledIcon />}
                        </IconButton>
                    </Tooltip>
                    {isHost && (
                        <Tooltip title={isRecording ? "Stop recording (Saved on device)" : "Record meeting (Saved on device)"}>
                            <IconButton onClick={onToggleRecording} sx={{ bgcolor: isRecording ? '#dc2626' : 'rgba(255,255,255,0.08)', color: 'white', minWidth: 44, minHeight: 44 }}>
                                {isRecording ? <StopIcon /> : <FiberManualRecordIcon sx={{ color: '#ef4444' }} />}
                            </IconButton>
                        </Tooltip>
                    )}
                    <Tooltip title="People">
                        <IconButton onClick={onTogglePeople} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white', minWidth: 44, minHeight: 44 }}>
                            <GroupsIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Device Settings">
                        <IconButton onClick={onOpenSettings} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white', minWidth: 44, minHeight: 44 }}>
                            <SettingsIcon />
                        </IconButton>
                    </Tooltip>
                </>
            )}

            <Tooltip title="In-Call Chat (C)">
                <IconButton onClick={onToggleChat} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white', minWidth: 44, minHeight: 44 }}>
                    <Badge badgeContent={unreadMessages} color="primary"><ChatIcon /></Badge>
                </IconButton>
            </Tooltip>

            {isMobile && (
                <IconButton onClick={(e) => setMoreAnchor(e.currentTarget)} sx={{ bgcolor: 'rgba(255,255,255,0.08)', color: 'white', minWidth: 44, minHeight: 44 }}>
                    <MoreVertIcon />
                </IconButton>
            )}

            <Tooltip title="Leave Meeting">
                <IconButton onClick={onLeaveCall} sx={{ bgcolor: '#ef4444', color: 'white', minWidth: 44, minHeight: 44, '&:hover': { bgcolor: '#dc2626' } }}>
                    <CallEndIcon />
                </IconButton>
            </Tooltip>

            {/* Reactions Popover */}
            <Menu anchorEl={reactionAnchor} open={Boolean(reactionAnchor)} onClose={() => setReactionAnchor(null)}
                slotProps={{ paper: { sx: { bgcolor: '#1e293b', borderRadius: '16px', p: 0.5 } } }}>
                <Box sx={{ display: 'flex', gap: 1, px: 1 }}>
                    {reactions.map(emoji => (
                        <IconButton key={emoji} onClick={() => { onSendReaction?.(emoji); setReactionAnchor(null); }} sx={{ fontSize: '1.4rem' }}>
                            {emoji}
                        </IconButton>
                    ))}
                </Box>
            </Menu>

            {/* Mobile More Actions Menu */}
            <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}
                slotProps={{ paper: { sx: { bgcolor: '#1e293b', color: 'white', borderRadius: '16px', minWidth: 200 } } }}>
                <MenuItem onClick={() => { onTogglePeople?.(); setMoreAnchor(null); }}>
                    <ListItemIcon><GroupsIcon sx={{ color: 'white' }} /></ListItemIcon>
                    <ListItemText>People</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onToggleHand(); setMoreAnchor(null); }}>
                    <ListItemIcon><PanToolIcon sx={{ color: isHandRaised ? '#f59e0b' : 'white' }} /></ListItemIcon>
                    <ListItemText>{isHandRaised ? "Lower Hand" : "Raise Hand"}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onToggleViewMode(); setMoreAnchor(null); }}>
                    <ListItemIcon><GridViewIcon sx={{ color: 'white' }} /></ListItemIcon>
                    <ListItemText>{viewMode === 'grid' ? "Speaker View" : "Grid View"}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onToggleCaptions(); setMoreAnchor(null); }}>
                    <ListItemIcon><ClosedCaptionIcon sx={{ color: 'white' }} /></ListItemIcon>
                    <ListItemText>Captions (Beta)</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { onOpenSettings(); setMoreAnchor(null); }}>
                    <ListItemIcon><SettingsIcon sx={{ color: 'white' }} /></ListItemIcon>
                    <ListItemText>Device Settings</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    );
}
