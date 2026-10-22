import React, { useState, useRef, useEffect } from 'react';
import {
    Drawer, Box, Typography, Tabs, Tab, List, ListItem, ListItemAvatar, ListItemText,
    ListItemSecondaryAction, Avatar, IconButton, TextField, Button, Chip, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import MicOffIcon from '@mui/icons-material/MicOff';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PanToolIcon from '@mui/icons-material/PanTool';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { getInitials, getAvatarColor } from '../../utils/audioChimes';

export default function Drawers({
    open, onClose, participants = [], isHost = false, isRoomLocked = false, waitingUsers = [],
    messages = [], typingUser = null, currentUserId, onSendMessage, onSendTyping,
    onLockRoom, onAdmitUser, onDenyUser, onMuteParticipant, onMuteAll, onRemoveParticipant
}) {
    const [currentTab, setCurrentTab] = useState(0);
    const [inputText, setInputText] = useState('');
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (open && currentTab === 1) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, open, currentTab]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        onSendMessage?.(inputText.trim());
        setInputText('');
    };

    const handleImageFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        if (file.size > 2 * 1024 * 1024) { alert("Image must be smaller than 2MB."); return; }
        const reader = new FileReader();
        reader.onload = (e) => onSendMessage?.(e.target.result);
        reader.readAsDataURL(file);
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                    handleImageFile(items[i].getAsFile());
                    break;
                }
            }
        }
    };

    return (
        <Drawer anchor="right" open={open} onClose={onClose}
            PaperProps={{ sx: { width: { xs: '100%', sm: 360 }, bgcolor: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.08)' } }}>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Tabs value={currentTab} onChange={(e, val) => setCurrentTab(val)} textColor="inherit">
                    <Tab label={`People (${participants.length})`} />
                    <Tab label="In-Call Chat" />
                </Tabs>
                <IconButton onClick={onClose} sx={{ color: 'white' }}><CloseIcon /></IconButton>
            </Box>

            {currentTab === 0 && (
                <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
                    {isHost && (
                        <Box sx={{ mb: 2, p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', mb: 1 }}>HOST CONTROLS</Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button size="small" variant="outlined" startIcon={isRoomLocked ? <LockIcon /> : <LockOpenIcon />}
                                    onClick={() => onLockRoom?.(!isRoomLocked)} sx={{ borderRadius: '8px', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
                                    {isRoomLocked ? "Room Locked" : "Lock Room"}
                                </Button>
                                <Button size="small" variant="outlined" color="error" startIcon={<VolumeOffIcon />} onClick={onMuteAll} sx={{ borderRadius: '8px' }}>
                                    Mute All
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {isHost && waitingUsers.length > 0 && (
                        <Box sx={{ mb: 2, p: 1.5, borderRadius: '12px', bgcolor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', mb: 1 }}>WAITING ROOM ({waitingUsers.length})</Typography>
                            {waitingUsers.map(u => (
                                <Box key={u.socketId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}>
                                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{u.username}</Typography>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Button size="small" variant="contained" color="success" onClick={() => onAdmitUser?.(u.socketId)} sx={{ py: 0.2, minWidth: 50, fontSize: '0.75rem' }}>Admit</Button>
                                        <Button size="small" variant="outlined" color="error" onClick={() => onDenyUser?.(u.socketId)} sx={{ py: 0.2, minWidth: 50, fontSize: '0.75rem' }}>Deny</Button>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}

                    <List sx={{ p: 0 }}>
                        {participants.map(p => (
                            <ListItem key={p.socketId} sx={{ px: 1, py: 0.75, borderRadius: '10px' }}>
                                <ListItemAvatar>
                                    <Avatar src={p.avatar} sx={{ bgcolor: getAvatarColor(p.name), width: 34, height: 34, fontSize: '0.85rem', fontWeight: 700 }}>
                                        {getInitials(p.name)}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 600 }}>{p.name} {p.isLocal && '(You)'}</Typography>
                                        {p.isHost && <Chip label="Host" size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#2563eb', color: 'white' }} />}
                                        {p.isHandRaised && <PanToolIcon sx={{ fontSize: '0.85rem', color: '#f59e0b' }} />}
                                    </Box>
                                } />
                                {isHost && !p.isLocal && (
                                    <ListItemSecondaryAction>
                                        <Tooltip title="Mute"><IconButton size="small" onClick={() => onMuteParticipant?.(p.socketId)} sx={{ color: '#94a3b8' }}><MicOffIcon fontSize="small" /></IconButton></Tooltip>
                                        <Tooltip title="Remove"><IconButton size="small" onClick={() => onRemoveParticipant?.(p.socketId)} sx={{ color: '#ef4444' }}><PersonRemoveIcon fontSize="small" /></IconButton></Tooltip>
                                    </ListItemSecondaryAction>
                                )}
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}

            {currentTab === 1 && (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        {messages.length === 0 ? (
                            <Typography sx={{ color: '#64748b', textAlign: 'center', mt: 4, fontSize: '0.9rem' }}>No messages yet. Say hello! 👋</Typography>
                        ) : (
                            messages.map((m, idx) => {
                                const isMe = m.socketId === currentUserId;
                                const isImg = m.data?.startsWith?.('data:image/');
                                return (
                                    <Box key={idx} sx={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                                        <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', mb: 0.2, textAlign: isMe ? 'right' : 'left' }}>{isMe ? 'You' : m.sender}</Typography>
                                        <Box sx={{ p: 1.2, borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', bgcolor: isMe ? '#2563eb' : '#1e293b' }}>
                                            {isImg ? <img src={m.data} alt="Attachment" style={{ maxWidth: '100%', borderRadius: '8px' }} /> : <Typography sx={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>{m.data}</Typography>}
                                        </Box>
                                    </Box>
                                );
                            })
                        )}
                        {typingUser && <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>{typingUser} is typing...</Typography>}
                        <div ref={chatEndRef} />
                    </Box>

                    <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }}
                            onChange={(e) => { handleImageFile(e.target.files?.[0]); e.target.value = ''; }} />
                        <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: '#94a3b8' }}><ImageIcon /></IconButton>
                        <TextField size="small" fullWidth placeholder="Type a message..." value={inputText}
                            onChange={(e) => { setInputText(e.target.value); onSendTyping?.(); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            onPaste={handlePaste}
                            sx={{ '& .MuiOutlinedInput-root': { color: 'white', bgcolor: '#1e293b', borderRadius: '12px' } }} />
                        <IconButton onClick={handleSend} color="primary" disabled={!inputText.trim()}><SendIcon /></IconButton>
                    </Box>
                </Box>
            )}
        </Drawer>
    );
}
