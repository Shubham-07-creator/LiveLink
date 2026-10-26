import React, { useState } from 'react';
import {
    Rating,
    TextField,
    Box
} from '@mui/material';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import tokens from '../../tokens';

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
        <Modal
            open={open}
            onClose={onClose}
            title="How was your call quality?"
            description="Your feedback helps us continuously improve WebRTC peer stability."
            maxWidth="xs"
            actions={
                <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: 1 }}>
                    <Button variant="ghost" onClick={onClose}>
                        Skip
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        loading={isSubmitting}
                    >
                        Submit
                    </Button>
                </Box>
            }
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 0.5 }}>
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
                            color: tokens.colors.dark.textHeading,
                            bgcolor: tokens.colors.call.tileBg,
                            borderRadius: tokens.radii.input,
                            '& fieldset': {
                                borderColor: tokens.colors.dark.border
                            }
                        }
                    }}
                />
            </Box>
        </Modal>
    );
}
