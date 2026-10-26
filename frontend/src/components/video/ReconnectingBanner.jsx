import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import tokens from '../../tokens';

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
                        bgcolor: 'rgba(220, 38, 38, 0.92)',
                        color: '#ffffff',
                        borderRadius: tokens.radii.badge,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 40
                    }}
                >
                    <CircularProgress size={16} color="inherit" thickness={5} />
                    <Typography sx={{ fontSize: tokens.typography.caption.fontSize, fontWeight: 700 }}>
                        Reconnecting peer-to-peer call...
                    </Typography>
                </Box>
            )}

            {/* 45-Second Failure Recovery Dialog */}
            <Modal
                open={Boolean(reconnectFailed)}
                onClose={() => {}}
                showCloseButton={false}
                title="Call Connection Lost"
                description="We could not restore the peer-to-peer connection after 45 seconds. Your network might be unstable or blocked by a symmetric firewall."
                maxWidth="xs"
                actions={
                    <Box sx={{ display: 'flex', width: '100%', justifyContent: 'center', gap: 1.5 }}>
                        <Button
                            variant="secondary"
                            startIcon={<HomeOutlinedIcon sx={{ fontSize: 20 }} />}
                            onClick={onLeave}
                        >
                            Return Home
                        </Button>
                        <Button
                            variant="primary"
                            startIcon={<ReplayOutlinedIcon sx={{ fontSize: 20 }} />}
                            onClick={onRetry}
                        >
                            Try Rejoining
                        </Button>
                    </Box>
                }
            >
                <Typography sx={{ display: 'none' }}>Connection lost</Typography>
            </Modal>
        </>
    );
}
