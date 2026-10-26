import React from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemSecondaryAction,
    Avatar,
    Chip,
    Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MicOffIcon from '@mui/icons-material/MicOff';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PanToolIcon from '@mui/icons-material/PanTool';
import HostPanel from './HostPanel';
import { getInitials, getAvatarColor } from '../../utils/audioChimes';

export default function PeopleDrawer({
    open,
    onClose,
    participants = [],
    isHost = false,
    isRoomLocked = false,
    waitingUsers = [],
    onLockRoom,
    onMuteAll,
    onAdmitUser,
    onDenyUser,
    onMuteParticipant,
    onRemoveParticipant
}) {
    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: { xs: '100%', sm: 360 },
                    bgcolor: '#0f172a',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: '1px solid rgba(255,255,255,0.08)'
                }
            }}
        >
            {/* Header */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
                    People ({participants.length})
                </Typography>
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Content Area */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                {/* Host Control Panel */}
                {isHost && (
                    <HostPanel
                        isRoomLocked={isRoomLocked}
                        waitingUsers={waitingUsers}
                        onLockRoom={onLockRoom}
                        onMuteAll={onMuteAll}
                        onAdmitUser={onAdmitUser}
                        onDenyUser={onDenyUser}
                    />
                )}

                {/* Participants List */}
                <List sx={{ p: 0 }}>
                    {participants.map((p, idx) => (
                        <ListItem key={p.socketId || idx} sx={{ px: 1, py: 0.8, borderRadius: '10px', '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' } }}>
                            <ListItemAvatar>
                                <Avatar
                                    src={p.avatar}
                                    sx={{ bgcolor: getAvatarColor(p.name), width: 36, height: 36, fontSize: '0.85rem', fontWeight: 700 }}
                                >
                                    {getInitials(p.name)}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 600 }}>
                                            {p.name} {p.isLocal && '(You)'}
                                        </Typography>
                                        {p.isHost && (
                                            <Chip label="Host" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#2563eb', color: 'white' }} />
                                        )}
                                        {p.isHandRaised && (
                                            <Tooltip title="Hand Raised">
                                                <PanToolIcon sx={{ fontSize: '0.85rem', color: '#f59e0b' }} />
                                            </Tooltip>
                                        )}
                                    </Box>
                                }
                            />
                            {isHost && !p.isLocal && (
                                <ListItemSecondaryAction>
                                    <Tooltip title="Mute participant">
                                        <IconButton size="small" onClick={() => onMuteParticipant?.(p.socketId)} sx={{ color: '#94a3b8' }}>
                                            <MicOffIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Remove participant">
                                        <IconButton size="small" onClick={() => onRemoveParticipant?.(p.socketId)} sx={{ color: '#ef4444' }}>
                                            <PersonRemoveIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </ListItemSecondaryAction>
                            )}
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Drawer>
    );
}
