import React from 'react';
import { Box, Typography, Button, Paper, CircularProgress } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import BlockIcon from '@mui/icons-material/Block';
import HomeIcon from '@mui/icons-material/Home';

export default function WaitingRoomModal({ isWaiting, isDenied, onLeave }) {
    if (!isWaiting && !isDenied) return null;

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                bgcolor: 'rgba(9, 13, 22, 0.95)',
                backdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
                zIndex: 60
            }}
        >
            <Paper
                sx={{
                    maxWidth: 440,
                    width: '100%',
                    borderRadius: '24px',
                    p: 4,
                    bgcolor: '#0f172a',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.1)',
                    textAlign: 'center'
                }}
            >
                {isWaiting ? (
                    <>
                        <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(37, 99, 235, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <LockIcon sx={{ fontSize: '2rem', color: '#2563eb' }} />
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
                            Waiting for the Host
                        </Typography>
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.92rem', mb: 3 }}>
                            This meeting is locked. The host has been notified that you are in the waiting room and will admit you shortly.
                        </Typography>
                        <CircularProgress size={32} sx={{ color: '#2563eb', mb: 3 }} />
                    </>
                ) : (
                    <>
                        <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <BlockIcon sx={{ fontSize: '2rem', color: '#ef4444' }} />
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
                            Entry Declined
                        </Typography>
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.92rem', mb: 3 }}>
                            The host has declined your request to join this meeting.
                        </Typography>
                    </>
                )}

                <Button
                    variant="outlined"
                    startIcon={<HomeIcon />}
                    onClick={onLeave}
                    sx={{ borderRadius: '12px', color: 'white', borderColor: 'rgba(255,255,255,0.2)', width: '100%' }}
                >
                    Return to Home
                </Button>
            </Paper>
        </Box>
    );
}
