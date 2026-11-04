import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  IconButton
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import { Button } from "./index";
import { useThemeMode } from "../../contexts/ThemeContext";

export default function LegalModal({ open, type = "privacy", onClose }) {
  const { tokens, isDark } = useThemeMode();
  const c = tokens?.colors || {};

  const getTitle = () => {
    if (type === "terms") return "Terms of Service";
    if (type === "security") return "Security Architecture";
    return "Privacy Policy";
  };

  const getIcon = () => {
    if (type === "terms") return <ShieldOutlinedIcon sx={{ color: c.primary || "#2563eb", fontSize: 28 }} />;
    if (type === "security") return <SecurityOutlinedIcon sx={{ color: c.primary || "#2563eb", fontSize: 28 }} />;
    return <LockOutlinedIcon sx={{ color: c.primary || "#2563eb", fontSize: 28 }} />;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: tokens?.radii?.modal || "24px",
          bgcolor: c.surface || (isDark ? "#111827" : "#ffffff"),
          border: `1px solid ${c.border || "#e2e8f0"}`,
          p: 1
        }
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {getIcon()}
          <Typography variant="h6" sx={{ fontFamily: tokens?.typography?.fonts?.heading, fontWeight: 700, color: c.textHeading }}>
            {getTitle()}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: c.textMuted }}>
          <CloseOutlinedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: c.border }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, py: 1 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: c.textHeading, mb: 0.5 }}>
              1. Encrypted Peer-to-Peer Media (DTLS-SRTP)
            </Typography>
            <Typography variant="body2" sx={{ color: c.textBody, lineHeight: 1.6 }}>
              All audio, video, and screen share data in LiveLink is transmitted directly between participants using WebRTC peer-to-peer mesh architecture, protected by mandatory DTLS-SRTP encryption. Media never traverses our application servers during peer-to-peer calls.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: c.textHeading, mb: 0.5 }}>
              2. Signaling Server Role & Data Relays
            </Typography>
            <Typography variant="body2" sx={{ color: c.textBody, lineHeight: 1.6 }}>
              The LiveLink signaling server (Node/Express & Socket.IO) acts strictly as a lightweight coordinator to relay connection metadata (SDP offers/answers, ICE candidates) and ephemeral room chat messages. The server never intercepts, decodes, records, or stores any audio or video streams.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: c.textHeading, mb: 0.5 }}>
              3. AI Summaries & Google Gemini (Host-Controlled & Ephemeral)
            </Typography>
            <Typography variant="body2" sx={{ color: c.textBody, lineHeight: 1.6 }}>
              AI meeting summaries are disabled by default and require explicit host enablement. When active, every attendee is shown a clear notification banner: <em>"AI Summary Active: Transcript will be sent to Google Gemini"</em>. Meeting transcripts are transmitted directly from our backend to the Gemini API, are processed in-memory, and are never stored in databases or saved to disk.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: c.textHeading, mb: 0.5 }}>
              4. Metered TURN Relay Fallback
            </Typography>
            <Typography variant="body2" sx={{ color: c.textBody, lineHeight: 1.6 }}>
              LiveLink prioritizes direct Google STUN P2P connections for over 80% of calls. A Metered TURN relay server is engaged only when strict corporate firewalls or symmetric NAT configurations block direct peer-to-peer packet transmission. TURN credentials are short-lived (1 hour) and issued via secure HMAC-SHA1 tokens.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: c.textHeading, mb: 0.5 }}>
              5. Local Recording Storage
            </Typography>
            <Typography variant="body2" sx={{ color: c.textBody, lineHeight: 1.6 }}>
              When a user initiates meeting recording, the recording is captured and encoded entirely inside their local browser via the MediaStream Recording API and downloaded directly to their device in WebM format. No meeting recording files are ever uploaded to LiveLink cloud storage.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="primary" size="normal" onClick={onClose}>
          Understood
        </Button>
      </DialogActions>
    </Dialog>
  );
}
