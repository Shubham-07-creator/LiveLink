import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import tokens from "../../tokens";

export default function TopBar({
  roomCode,
  duration = 0,
  participantCount = 1,
  isRecording = false,
  isVisible = true,
  onCopyLink,
  onTogglePeople
}) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(remMins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(remMins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <Box
      sx={{
        position: "absolute",
        top: 16,
        left: 16,
        right: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        pointerEvents: isVisible ? "auto" : "none",
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${tokens.motion.micro}`,
        zIndex: 25
      }}
    >
      {/* Left: Room code + Copy link + Duration Timer */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: "6px 14px",
          borderRadius: tokens.radii.badge,
          bgcolor: tokens.colors.call.dockBg,
          backdropFilter: "blur(16px)",
          border: `1px solid ${tokens.colors.call.dockBorder}`
        }}
      >
        <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#ffffff", letterSpacing: "0.01em" }}>
          {roomCode}
        </Typography>

        <Tooltip title="Copy link">
          <IconButton size="small" onClick={onCopyLink} sx={{ color: "#94a3b8", p: 0.5, "&:hover": { color: "#ffffff" } }}>
            <ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>

        <Box sx={{ width: "1px", height: "16px", bgcolor: "rgba(255, 255, 255, 0.15)" }} />

        <Typography sx={{ fontFamily: "monospace", fontSize: "13px", color: "#94a3b8", fontWeight: 500 }}>
          {formatTime(duration)}
        </Typography>

        {isRecording && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 0.5 }}>
            <FiberManualRecordIcon sx={{ color: tokens?.accent?.dotRed || tokens?.colors?.accent?.dotRed || "#ef4444", fontSize: 14 }} />
            <Typography sx={{ fontSize: "12px", color: "#f87171", fontWeight: 700 }}>
              REC
            </Typography>
          </Box>
        )}
      </Box>

      {/* Right: Security Badge + Participant Count */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {/* Encrypted peer-to-peer badge */}
        <Box
          sx={{
            display: { xs: "none", sm: "flex" },
            alignItems: "center",
            gap: 1,
            p: "6px 14px",
            borderRadius: tokens.radii.badge,
            bgcolor: tokens.colors.call.dockBg,
            backdropFilter: "blur(16px)",
            border: `1px solid ${tokens.colors.call.dockBorder}`
          }}
        >
          <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: tokens?.accent?.dotGreen || tokens?.colors?.accent?.dotGreen || "#16a34a" }} />
          <LockOutlinedIcon sx={{ fontSize: 15, color: "#cbd5e1" }} />
          <Typography sx={{ fontSize: "12px", fontWeight: 600, color: "#cbd5e1" }}>
            Encrypted peer-to-peer
          </Typography>
        </Box>

        {/* Participant Count Button */}
        <Tooltip title="View participants">
          <IconButton
            onClick={onTogglePeople}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              p: "6px 12px",
              borderRadius: tokens.radii.badge,
              bgcolor: tokens.colors.call.dockBg,
              backdropFilter: "blur(16px)",
              border: `1px solid ${tokens.colors.call.dockBorder}`,
              color: "#ffffff",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.12)" }
            }}
          >
            <GroupsOutlinedIcon sx={{ fontSize: 18 }} />
            <Typography sx={{ fontSize: "13px", fontWeight: 700 }}>
              {participantCount}
            </Typography>
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
