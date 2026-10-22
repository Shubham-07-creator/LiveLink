import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

export default function CaptionsOverlay({ active, currentTranscript, speakerName }) {
    if (!active || !currentTranscript) return null;

    return (
        <Box
            sx={{
                position: 'absolute',
                bottom: 96,
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '80%',
                bgcolor: 'rgba(0, 0, 0, 0.75)',
                color: 'white',
                px: 2.5,
                py: 1.25,
                borderRadius: '16px',
                backdropFilter: 'blur(8px)',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
                zIndex: 25,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
            }}
        >
            <Chip
                label="Beta, Chrome only"
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#93c5fd', fontSize: '0.7rem', height: 20 }}
            />
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 500 }}>
                {speakerName && <strong style={{ color: '#60a5fa' }}>{speakerName}: </strong>}
                {currentTranscript}
            </Typography>
        </Box>
    );
}
