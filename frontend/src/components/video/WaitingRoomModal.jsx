import React from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import Button from '../ui/Button';
import tokens from '../../tokens';

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
                    borderRadius: tokens.radii.modal,
                    p: 4,
                    bgcolor: tokens.colors.dark.surface,
                    color: tokens.colors.dark.textHeading,
                    border: `1px solid ${tokens.colors.dark.border}`,
                    textAlign: 'center'
                }}
            >
                {isWaiting ? (
                    <>
                        <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <LockOutlinedIcon sx={{ fontSize: '2rem', color: tokens.colors.dark.primary }} />
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5, color: tokens.colors.dark.textHeading }}>
                            Waiting for the Host
                        </Typography>
                        <Typography sx={{ color: tokens.colors.dark.textMuted, fontSize: tokens.typography.body.fontSize, mb: 3 }}>
                            This meeting is locked. The host has been notified that you are in the waiting room and will admit you shortly.
                        </Typography>
                        <CircularProgress size={32} sx={{ color: tokens.colors.dark.primary, mb: 3 }} />
                    </>
                ) : (
                    <>
                        <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: tokens.colors.light.dangerSoftBg, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                            <BlockOutlinedIcon sx={{ fontSize: '2rem', color: tokens.colors.light.danger }} />
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5, color: tokens.colors.dark.textHeading }}>
                            Entry Declined
                        </Typography>
                        <Typography sx={{ color: tokens.colors.dark.textMuted, fontSize: tokens.typography.body.fontSize, mb: 3 }}>
                            The host has declined your request to join this meeting.
                        </Typography>
                    </>
                )}

                <Button
                    variant="secondary"
                    startIcon={<HomeOutlinedIcon sx={{ fontSize: 20 }} />}
                    onClick={onLeave}
                    fullWidth
                >
                    Return to Home
                </Button>
            </Paper>
        </Box>
    );
}
