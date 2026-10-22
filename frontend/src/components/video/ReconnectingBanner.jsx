import React from 'react';
import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import HomeIcon from '@mui/icons-material/Home';

export default function ReconnectingBanner({ isReconnecting, reconnectFailed, onRetry, onLeave }) {
    return (
        <>
            {/* Floating Top Banner when reconnecting */}
            {isReconnecting && !reconnectFailed && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 2.5,
                        py: 1,
                        bgcolor: 'rgba(239, 68, 68, 0.92)',
                        color: 'white',
                        borderRadius: '24px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 40
                    }}
                >
                    <CircularProgress size={16} color="inherit" thickness={5} />
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 700 }}>
                        Reconnecting peer-to-peer call...
                    </Typography>
                </Box>
            )}

            {/* 45-Second Failure Recovery Dialog */}
            <Dialog
                open={Boolean(reconnectFailed)}
                PaperProps={{
                    sx: {
                        bgcolor: '#0f172a',
                        color: 'white',
                        borderRadius: '20px',
                        p: 1.5,
                        maxWidth: 420,
                        border: '1px solid rgba(255,255,255,0.1)'
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pb: 1 }}>
                    Call Connection Lost
                </DialogTitle>
                <DialogContent sx={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.92rem' }}>
                    We could not restore the peer-to-peer connection after 45 seconds. Your network might be unstable or blocked by a symmetric firewall.
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', gap: 1.5, pb: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<HomeIcon />}
                        onClick={onLeave}
                        sx={{ borderRadius: '12px', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}
                    >
                        Return Home
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<ReplayIcon />}
                        onClick={onRetry}
                        sx={{ borderRadius: '12px', bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' } }}
                    >
                        Try Rejoining
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
