import React from 'react';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box
} from '@mui/material';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import tokens from '../../tokens';
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
        <Modal
            open={open}
            onClose={onClose}
            title="Audio & Video Settings"
            description="Select and test your hardware devices."
            maxWidth="xs"
            actions={
                <Button onClick={onClose} variant="primary" fullWidth>
                    Done
                </Button>
            }
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
                {videoDevices.length > 0 && (
                    <FormControl fullWidth size="small">
                        <InputLabel sx={{ color: tokens.colors.dark.textMuted }}>Camera</InputLabel>
                        <Select
                            value={selectedCamera || videoDevices[0]?.deviceId || ''}
                            onChange={(e) => onSwitchCamera(e.target.value)}
                            label="Camera"
                            sx={{
                                color: tokens.colors.dark.textHeading,
                                bgcolor: tokens.colors.call.tileBg,
                                borderRadius: tokens.radii.input
                            }}
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
                        <InputLabel sx={{ color: tokens.colors.dark.textMuted }}>Microphone</InputLabel>
                        <Select
                            value={selectedMicrophone || audioInputDevices[0]?.deviceId || ''}
                            onChange={(e) => onSwitchMicrophone(e.target.value)}
                            label="Microphone"
                            sx={{
                                color: tokens.colors.dark.textHeading,
                                bgcolor: tokens.colors.call.tileBg,
                                borderRadius: tokens.radii.input
                            }}
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
                            <InputLabel sx={{ color: tokens.colors.dark.textMuted }}>Speaker</InputLabel>
                            <Select
                                value={selectedSpeaker || audioOutputDevices[0]?.deviceId || ''}
                                onChange={(e) => onSwitchSpeaker(e.target.value)}
                                label="Speaker"
                                sx={{
                                    color: tokens.colors.dark.textHeading,
                                    bgcolor: tokens.colors.call.tileBg,
                                    borderRadius: tokens.radii.input
                                }}
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
                        variant="secondary"
                        startIcon={<VolumeUpOutlinedIcon sx={{ fontSize: 20 }} />}
                        onClick={handleTestSpeaker}
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        Test
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}
