import React from 'react';
import { Box, Typography } from '@mui/material';
import Chip from '../ui/Chip';
import tokens from '../../tokens';

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
                color: '#ffffff',
                px: 2.5,
                py: 1.25,
                borderRadius: tokens.radii.tile,
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
                variant="info"
            />
            <Typography sx={{ fontSize: tokens.typography.body.fontSize, fontWeight: 500 }}>
                {speakerName && <strong style={{ color: tokens.colors.dark.primaryHover }}>{speakerName}: </strong>}
                {currentTranscript}
            </Typography>
        </Box>
    );
}
