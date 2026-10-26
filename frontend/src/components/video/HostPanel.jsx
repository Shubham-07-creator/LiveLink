import React from 'react';
import { Box, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import VolumeOffOutlinedIcon from '@mui/icons-material/VolumeOffOutlined';
import Button from '../ui/Button';
import tokens from '../../tokens';

export default function HostPanel({
    isRoomLocked,
    waitingUsers = [],
    onLockRoom,
    onMuteAll,
    onAdmitUser,
    onDenyUser
}) {
    return (
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Quick Actions Row */}
            <Box
                sx={{
                    p: 1.5,
                    borderRadius: tokens.radii.card,
                    bgcolor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)'
                }}
            >
                <Typography
                    sx={{
                        fontSize: tokens.typography.caption.fontSize,
                        fontWeight: 700,
                        color: tokens.colors.dark.textMuted,
                        mb: 1,
                        letterSpacing: '0.05em'
                    }}
                >
                    HOST MODERATION
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        size="small"
                        variant="secondary"
                        startIcon={isRoomLocked ? <LockOutlinedIcon sx={{ fontSize: 16 }} /> : <LockOpenOutlinedIcon sx={{ fontSize: 16 }} />}
                        onClick={() => onLockRoom?.(!isRoomLocked)}
                        sx={{ fontSize: '0.78rem' }}
                    >
                        {isRoomLocked ? "Room Locked" : "Lock Room"}
                    </Button>
                    <Button
                        size="small"
                        variant="danger"
                        startIcon={<VolumeOffOutlinedIcon sx={{ fontSize: 16 }} />}
                        onClick={onMuteAll}
                        sx={{ fontSize: '0.78rem' }}
                    >
                        Mute All
                    </Button>
                </Box>
            </Box>

            {/* Waiting Room Queue */}
            {waitingUsers.length > 0 && (
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: tokens.radii.card,
                        bgcolor: tokens.colors.light.warningSoftBg,
                        border: `1px solid ${tokens.colors.light.warning}`
                    }}
                >
                    <Typography sx={{ fontSize: tokens.typography.caption.fontSize, fontWeight: 700, color: tokens.colors.light.warning, mb: 1 }}>
                        WAITING ROOM ({waitingUsers.length})
                    </Typography>
                    {waitingUsers.map(u => (
                        <Box key={u.socketId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: tokens.colors.light.textHeading }}>
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
