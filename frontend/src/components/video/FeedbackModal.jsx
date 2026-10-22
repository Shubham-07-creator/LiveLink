import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Rating,
    TextField,
    Box,
    Typography,
    CircularProgress
} from '@mui/material';

export default function FeedbackModal({ open, onSubmit, onClose }) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await onSubmit?.({ rating, comment });
        } finally {
            setIsSubmitting(false);
            onClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    bgcolor: '#0f172a',
                    color: 'white',
                    borderRadius: '20px',
                    p: 1.5,
                    maxWidth: 420,
                    width: '100%',
                    border: '1px solid rgba(255,255,255,0.1)'
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pb: 0.5 }}>
                How was your call quality?
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 1 }}>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>
                    Your feedback helps us continuously improve WebRTC peer stability.
                </Typography>
                <Box sx={{ py: 1 }}>
                    <Rating
                        value={rating}
                        onChange={(e, val) => setRating(val || 5)}
                        size="large"
                        sx={{ fontSize: '2.5rem' }}
                    />
                </Box>
                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Any issues with audio, video, or disconnection? (Optional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            color: 'white',
                            bgcolor: '#1e293b',
                            borderRadius: '12px'
                        }
                    }}
                />
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2.5 }}>
                <Button onClick={onClose} sx={{ color: '#94a3b8' }}>
                    Skip
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    sx={{ borderRadius: '12px', bgcolor: '#2563eb', px: 3 }}
                >
                    {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "Submit"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
