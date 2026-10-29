import React, { useState, useRef, useEffect } from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import tokens from "../../tokens";

export default function ChatDrawer({
  open,
  onClose,
  messages = [],
  typingUser = null,
  currentUserId,
  isChatDisabled = false,
  onSendMessage,
  onSendTyping
}) {
  const [inputText, setInputText] = useState("");
  const [fileError, setFileError] = useState("");
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage?.(inputText.trim());
    setInputText("");
    setFileError("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 2 * 1024 * 1024) {
      setFileError("Image must be smaller than 2MB.");
      return;
    }
    setFileError("");
    const reader = new FileReader();
    reader.onload = (e) => onSendMessage?.(e.target.result);
    reader.readAsDataURL(file);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
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
          width: { xs: "100%", sm: 360 },
          bgcolor: tokens.colors.dark.surface,
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          borderLeft: `1px solid ${tokens.colors.dark.border}`
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${tokens.colors.dark.border}`
        }}
      >
        <Typography
          sx={{
            fontFamily: tokens.typography.fonts.heading,
            fontWeight: 700,
            fontSize: "16px"
          }}
        >
          In-call chat
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: "#94a3b8", "&:hover": { color: "#ffffff" } }}>
          <CloseOutlinedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* Messages Body */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {messages.length === 0 ? (
          <Typography sx={{ color: "#64748b", textAlign: "center", mt: 6, fontSize: "14px" }}>
            No messages yet. Send a message to get started.
          </Typography>
        ) : (
          messages.map((m, idx) => {
            const isMe = m.socketId === currentUserId;
            const isImg = m.data?.startsWith?.("data:image/");
            const timeStr = m.timestamp
              ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "";

            return (
              <Box key={idx} sx={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "84%" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3, justifyContent: isMe ? "flex-end" : "flex-start" }}>
                  <Typography sx={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
                    {isMe ? "You" : m.sender}
                  </Typography>
                  {timeStr && (
                    <Typography sx={{ fontSize: "10px", color: "#64748b" }}>
                      {timeStr}
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{
                    p: 1.4,
                    borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    bgcolor: isMe ? tokens.colors.light.primary : "#1e293b",
                    color: "#ffffff"
                  }}
                >
                  {isImg ? (
                    <img src={m.data} alt="Attachment" style={{ maxWidth: "100%", borderRadius: "8px" }} />
                  ) : (
                    <Typography sx={{ fontSize: "14px", wordBreak: "break-word", lineHeight: 1.5 }}>
                      {m.data}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })
        )}
        {typingUser && (
          <Typography sx={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
            {typingUser} is typing...
          </Typography>
        )}
        <div ref={chatEndRef} />
      </Box>

      {/* Inline File Error if any */}
      {fileError && (
        <Box sx={{ px: 2, py: 0.5, bgcolor: "rgba(220, 38, 38, 0.2)", color: "#f87171", fontSize: "12px" }}>
          {fileError}
        </Box>
      )}

      {/* Input Bar or Disabled Notice */}
      {isChatDisabled ? (
        <Box
          sx={{
            p: 2,
            borderTop: `1px solid ${tokens.colors.dark.border}`,
            bgcolor: "rgba(239, 68, 68, 0.08)",
            textAlign: "center"
          }}
        >
          <Typography sx={{ fontSize: "12px", color: "#f87171", fontWeight: 600 }}>
            🔒 Meeting host has disabled chat for participants
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            p: 1.5,
            borderTop: `1px solid ${tokens.colors.dark.border}`,
            display: "flex",
            alignItems: "center",
            gap: 1
          }}
        >
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={(e) => {
              handleImageFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <IconButton size="small" onClick={() => fileInputRef.current?.click()} sx={{ color: "#94a3b8" }}>
            <ImageOutlinedIcon sx={{ fontSize: 20 }} />
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
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#ffffff",
                bgcolor: "#1e293b",
                borderRadius: tokens.radii.input,
                fontSize: "14px"
              }
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!inputText.trim()}
            sx={{
              color: tokens.colors.light.primary,
              "&:disabled": { color: "#475569" }
            }}
          >
            <SendOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      )}
    </Drawer>
  );
}
