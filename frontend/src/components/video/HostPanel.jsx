import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

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
            <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', mb: 1, letterSpacing: '0.05em' }}>
                    HOST MODERATION
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={isRoomLocked ? <LockIcon /> : <LockOpenIcon />}
                        onClick={() => onLockRoom?.(!isRoomLocked)}
                        sx={{ borderRadius: '8px', color: 'white', borderColor: 'rgba(255,255,255,0.2)', fontSize: '0.78rem' }}
                    >
                        {isRoomLocked ? "Room Locked" : "Lock Room"}
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<VolumeOffIcon />}
                        onClick={onMuteAll}
                        sx={{ borderRadius: '8px', fontSize: '0.78rem' }}
                    >
                        Mute All
                    </Button>
                </Box>
            </Box>

            {/* Waiting Room Queue */}
            {waitingUsers.length > 0 && (
                <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', mb: 1 }}>
                        WAITING ROOM ({waitingUsers.length})
                    </Typography>
                    {waitingUsers.map(u => (
                        <Box key={u.socketId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{u.username}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    onClick={() => onAdmitUser?.(u.socketId)}
                                    sx={{ py: 0.2, minWidth: 50, fontSize: '0.72rem' }}
                                >
                                    Admit
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
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
