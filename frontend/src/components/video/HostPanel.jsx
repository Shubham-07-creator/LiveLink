import React from 'react';
import { Box, Typography, Switch } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';
import ScreenShareOutlinedIcon from '@mui/icons-material/ScreenShareOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import CallEndOutlinedIcon from '@mui/icons-material/CallEndOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';

import Button from '../ui/Button';
import tokens from '../../tokens';

export default function HostPanel({
    isRoomLocked,
    waitingUsers = [],
    roomPermissions = { allowScreenShare: true, allowChat: true },
    onLockRoom,
    onMuteAll,
    onToggleScreenSharePermission,
    onToggleChatPermission,
    onEndMeetingForAll,
    onAdmitUser,
    onDenyUser
}) {
    return (
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Host Moderation Card */}
            <Box
                sx={{
                    p: 1.5,
                    borderRadius: tokens.radii.card,
                    bgcolor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                    <AdminPanelSettingsOutlinedIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                    <Typography
                        sx={{
                            fontSize: tokens.typography.caption.fontSize,
                            fontWeight: 700,
                            color: '#f59e0b',
                            letterSpacing: '0.05em'
                        }}
                    >
                        HOST POWERS &amp; CONTROLS
                    </Typography>
                </Box>

                {/* Quick Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                    <Button
                        size="small"
                        variant={isRoomLocked ? "danger" : "secondary"}
                        startIcon={isRoomLocked ? <LockOutlinedIcon sx={{ fontSize: 15 }} /> : <LockOpenOutlinedIcon sx={{ fontSize: 15 }} />}
                        onClick={() => onLockRoom?.(!isRoomLocked)}
                        sx={{ fontSize: '0.75rem', py: 0.4 }}
                    >
                        {isRoomLocked ? "Unlock Room" : "Lock Room"}
                    </Button>
                    <Button
                        size="small"
                        variant="secondary"
                        startIcon={<VolumeOffOutlinedIcon sx={{ fontSize: 15 }} />}
                        onClick={onMuteAll}
                        sx={{ fontSize: '0.75rem', py: 0.4 }}
                    >
                        Mute All
                    </Button>
                    {onEndMeetingForAll && (
                        <Button
                            size="small"
                            variant="danger"
                            startIcon={<CallEndOutlinedIcon sx={{ fontSize: 15 }} />}
                            onClick={onEndMeetingForAll}
                            sx={{ fontSize: '0.75rem', py: 0.4 }}
                        >
                            End for All
                        </Button>
                    )}
                </Box>

                {/* Participant Permission Toggles */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pt: 0.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ScreenShareOutlinedIcon sx={{ fontSize: 15, color: '#94a3b8' }} />
                            <Typography sx={{ fontSize: '12px', color: '#cbd5e1' }}>
                                Allow Screen Sharing
                            </Typography>
                        </Box>
                        <Switch
                            size="small"
                            checked={roomPermissions?.allowScreenShare !== false}
                            onChange={(e) => onToggleScreenSharePermission?.(e.target.checked)}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 15, color: '#94a3b8' }} />
                            <Typography sx={{ fontSize: '12px', color: '#cbd5e1' }}>
                                Allow Participant Chat
                            </Typography>
                        </Box>
                        <Switch
                            size="small"
                            checked={roomPermissions?.allowChat !== false}
                            onChange={(e) => onToggleChatPermission?.(e.target.checked)}
                        />
                    </Box>
                </Box>
            </Box>

            {/* Waiting Room Queue */}
            {waitingUsers.length > 0 && (
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: tokens.radii.card,
                        bgcolor: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}
                >
                    <Typography sx={{ fontSize: tokens.typography.caption.fontSize, fontWeight: 700, color: '#f59e0b', mb: 1 }}>
                        WAITING ROOM ({waitingUsers.length})
                    </Typography>
                    {waitingUsers.map(u => (
                        <Box key={u.socketId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
                                {u.username}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Button
                                    size="small"
                                    variant="primary"
                                    onClick={() => onAdmitUser?.(u.socketId)}
                                    sx={{ py: 0.2, minWidth: 50, fontSize: '0.72rem' }}
                                >
                                    Admit
                                </Button>
                                <Button
                                    size="small"
                                    variant="danger"
                                    onClick={() => onDenyUser?.(u.socketId)}
                                    sx={{ py: 0.2, minWidth: 50, fontSize: '0.72rem' }}
                                >
                                    Deny
                                </Button>
                            </Box>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}
