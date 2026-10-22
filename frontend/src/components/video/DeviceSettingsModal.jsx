import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { playChime } from '../../utils/audioChimes';

export default function DeviceSettingsModal({
    open,
    onClose,
    videoDevices = [],
    audioInputDevices = [],
    audioOutputDevices = [],
    selectedCamera,
    selectedMicrophone,
    selectedSpeaker,
    onSwitchCamera,
    onSwitchMicrophone,
    onSwitchSpeaker
}) {
    const handleTestSpeaker = () => {
        playChime('beep');
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
                    width: '100%',
                    maxWidth: 440,
                    border: '1px solid rgba(255,255,255,0.1)'
                }
            }}
        >
            <DialogTitle sx={{ fontWeight: 800 }}>Audio & Video Settings</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                {videoDevices.length > 0 && (
                    <FormControl fullWidth size="small">
                        <InputLabel sx={{ color: '#94a3b8' }}>Camera</InputLabel>
                        <Select
                            value={selectedCamera || videoDevices[0]?.deviceId || ''}
                            onChange={(e) => onSwitchCamera(e.target.value)}
                            label="Camera"
                            sx={{ color: 'white', bgcolor: '#1e293b', borderRadius: '12px' }}
                        >
                            {videoDevices.map(d => (
                                <MenuItem key={d.deviceId} value={d.deviceId}>
                                    {d.label || `Camera (${d.deviceId.slice(0, 6)}...)`}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                {audioInputDevices.length > 0 && (
                    <FormControl fullWidth size="small">
                        <InputLabel sx={{ color: '#94a3b8' }}>Microphone</InputLabel>
                        <Select
                            value={selectedMicrophone || audioInputDevices[0]?.deviceId || ''}
                            onChange={(e) => onSwitchMicrophone(e.target.value)}
                            label="Microphone"
                            sx={{ color: 'white', bgcolor: '#1e293b', borderRadius: '12px' }}
                        >
                            {audioInputDevices.map(d => (
                                <MenuItem key={d.deviceId} value={d.deviceId}>
                                    {d.label || `Mic (${d.deviceId.slice(0, 6)}...)`}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                <Box sx={{ display: 'flex', gap: 1 }}>
                    {audioOutputDevices.length > 0 && (
                        <FormControl fullWidth size="small">
                            <InputLabel sx={{ color: '#94a3b8' }}>Speaker</InputLabel>
                            <Select
                                value={selectedSpeaker || audioOutputDevices[0]?.deviceId || ''}
                                onChange={(e) => onSwitchSpeaker(e.target.value)}
                                label="Speaker"
                                sx={{ color: 'white', bgcolor: '#1e293b', borderRadius: '12px' }}
                            >
                                {audioOutputDevices.map(d => (
                                    <MenuItem key={d.deviceId} value={d.deviceId}>
                                        {d.label || `Speaker (${d.deviceId.slice(0, 6)}...)`}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    <Button
                        variant="outlined"
                        startIcon={<VolumeUpIcon />}
                        onClick={handleTestSpeaker}
                        sx={{ borderRadius: '12px', whiteSpace: 'nowrap', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}
                    >
                        Test
                    </Button>
                </Box>
            </DialogContent>
            <DialogActions sx={{ pr: 3, pb: 2 }}>
                <Button onClick={onClose} variant="contained" sx={{ borderRadius: '12px', bgcolor: '#2563eb' }}>
                    Done
                </Button>
            </DialogActions>
        </Dialog>
    );
}
