import React, { useState, useRef, useEffect } from 'react';
import {
    Drawer,
    Box,
    Typography,
    IconButton,
    TextField
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';

export default function ChatDrawer({
    open,
    onClose,
    messages = [],
    typingUser = null,
    currentUserId,
    onSendMessage,
    onSendTyping
}) {
    const [inputText, setInputText] = useState('');
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (open) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, open]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        onSendMessage?.(inputText.trim());
        setInputText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleImageFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        if (file.size > 2 * 1024 * 1024) {
            alert("Image must be smaller than 2MB.");
            return;
        }
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
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: { xs: '100%', sm: 360 },
                    bgcolor: '#0f172a',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    borderLeft: '1px solid rgba(255,255,255,0.08)'
                }
            }}
        >
            {/* Header */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>
                    In-Call Chat
                </Typography>
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Messages Body */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {messages.length === 0 ? (
                    <Typography sx={{ color: '#64748b', textAlign: 'center', mt: 4, fontSize: '0.9rem' }}>
                        No messages yet. Say hello! 👋
                    </Typography>
                ) : (
                    messages.map((m, idx) => {
                        const isMe = m.socketId === currentUserId;
                        const isImg = m.data?.startsWith?.('data:image/');

                        return (
                            <Box key={idx} sx={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                                <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', mb: 0.2, textAlign: isMe ? 'right' : 'left' }}>
                                    {isMe ? 'You' : m.sender}
                                </Typography>
                                <Box sx={{ p: 1.2, borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', bgcolor: isMe ? '#2563eb' : '#1e293b' }}>
                                    {isImg ? (
                                        <img src={m.data} alt="Attachment" style={{ maxWidth: '100%', borderRadius: '8px' }} />
                                    ) : (
                                        <Typography sx={{ fontSize: '0.85rem', wordBreak: 'break-word' }}>{m.data}</Typography>
                                    )}
                                </Box>
                            </Box>
                        );
                    })
                )}
                {typingUser && (
                    <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        {typingUser} is typing...
                    </Typography>
                )}
                <div ref={chatEndRef} />
            </Box>

            {/* Input Bar */}
            <Box sx={{ p: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        handleImageFile(e.target.files?.[0]);
                        e.target.value = '';
                    }}
                />
                <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: '#94a3b8' }}>
                    <ImageIcon />
                </IconButton>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => {
                        setInputText(e.target.value);
                        onSendTyping?.();
                    }}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    sx={{ '& .MuiOutlinedInput-root': { color: 'white', bgcolor: '#1e293b', borderRadius: '12px' } }}
                />
                <IconButton onClick={handleSend} color="primary" disabled={!inputText.trim()}>
                    <SendIcon />
                </IconButton>
            </Box>
        </Drawer>
    );
}
