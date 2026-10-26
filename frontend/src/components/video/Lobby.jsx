import React, { useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Alert,
  AvatarGroup,
  Avatar,
  Tooltip
} from "@mui/material";

import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import MicOffOutlinedIcon from "@mui/icons-material/MicOffOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import VideocamOffOutlinedIcon from "@mui/icons-material/VideocamOffOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";

import { Button, IconButton, Card, Input, Chip } from "../ui";
import DeviceSelector from "./DeviceSelector";
import { playChime, getInitials, getAvatarColor } from "../../utils/audioChimes";
import tokens from "../../tokens";

export default function Lobby({
  localStream,
  username,
  onUsernameChange,
  videoEnabled,
  audioEnabled,
  permissionDenied,
  audioVolume = 0,
  videoDevices = [],
  audioInputDevices = [],
  audioOutputDevices = [],
  selectedCamera,
  selectedMicrophone,
  selectedSpeaker,
  lobbyParticipants = [],
  onToggleVideo,
  onToggleAudio,
  onSwitchCamera,
  onSwitchMicrophone,
  onSwitchSpeaker,
  onJoinWithoutMedia,
  onJoinMeeting
}) {
  const videoRef = useRef(null);
  const callTokens = tokens.colors.call;
  const roomCode = window.location.pathname.replace(/^\//, "");

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const micBars = [10, 25, 45, 65, 85];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: callTokens.stageBg,
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 2, sm: 4 }
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 960,
          bgcolor: callTokens.tileBg,
          borderColor: "rgba(255, 255, 255, 0.08)",
          boxShadow: "none",
          p: { xs: 2.5, md: 4 }
        }}
      >
        {permissionDenied && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              borderRadius: tokens.radii.button,
              bgcolor: "rgba(245, 158, 11, 0.15)",
              color: "#fef3c7",
              fontSize: "13px",
              border: "1px solid rgba(245, 158, 11, 0.3)"
            }}
            action={
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button variant="ghost" size="small" onClick={() => window.location.reload()}>
                  Try again
                </Button>
                <Button variant="secondary" size="small" onClick={onJoinWithoutMedia}>
                  Join without camera/mic
                </Button>
              </Box>
            }
          >
            Camera or mic access is blocked by your browser. Click the lock icon in the address bar to allow permissions.
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr" },
            gap: 3.5,
            alignItems: "start"
          }}
        >
          {/* Left: 16:9 Video Preview & Mic Meter */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                position: "relative",
                width: "100%",
                aspectRatio: "16/9",
                borderRadius: tokens.radii.tile,
                bgcolor: "#000000",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.08)"
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                  display: videoEnabled ? "block" : "none"
                }}
              />
              {!videoEnabled && (
                <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: getAvatarColor(username),
                      fontSize: "2rem",
                      fontWeight: 700
                    }}
                  >
                    {getInitials(username || "You")}
                  </Avatar>
                </Box>
              )}

              {/* Floating Glass Pill Overlay */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: 14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: "6px 12px",
                  borderRadius: tokens.radii.badge,
                  bgcolor: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.12)"
                }}
              >
                <IconButton
                  tooltip={audioEnabled ? "Turn off mic" : "Turn on mic"}
                  variant={audioEnabled ? "default" : "danger"}
                  size="normal"
                  shape="round"
                  onClick={onToggleAudio}
                  ariaLabel="Toggle microphone"
                  sx={{
                    bgcolor: audioEnabled ? callTokens.dockIconNormal : callTokens.offState,
                    color: "#ffffff",
                    "&:hover": { bgcolor: audioEnabled ? callTokens.dockIconHover : callTokens.offStateHover }
                  }}
                >
                  {audioEnabled ? <MicNoneOutlinedIcon /> : <MicOffOutlinedIcon />}
                </IconButton>

                <IconButton
                  tooltip={videoEnabled ? "Turn off camera" : "Turn on camera"}
                  variant={videoEnabled ? "default" : "danger"}
                  size="normal"
                  shape="round"
                  onClick={onToggleVideo}
                  ariaLabel="Toggle camera"
                  sx={{
                    bgcolor: videoEnabled ? callTokens.dockIconNormal : callTokens.offState,
                    color: "#ffffff",
                    "&:hover": { bgcolor: videoEnabled ? callTokens.dockIconHover : callTokens.offStateHover }
                  }}
                >
                  {videoEnabled ? <VideocamOutlinedIcon /> : <VideocamOffOutlinedIcon />}
                </IconButton>
              </Box>
            </Box>

            {/* 5-Bar Live Mic Meter */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 0.5 }}>
              <MicNoneOutlinedIcon sx={{ fontSize: 18, color: audioEnabled ? "#22c55e" : callTokens.offState }} />
              <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "12px", minWidth: 65 }}>
                {audioEnabled ? "Mic level:" : "Mic muted"}
              </Typography>
              <Box sx={{ display: "flex", gap: 0.8, flex: 1, alignItems: "center" }}>
                {micBars.map((threshold, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      flex: 1,
                      height: 5,
                      borderRadius: 1,
                      bgcolor: audioEnabled && audioVolume >= threshold ? "#22c55e" : "rgba(255, 255, 255, 0.12)",
                      transition: `background-color ${tokens.motion.micro}`
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>

          {/* Right: Device Dropdowns & Join Form */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontFamily: tokens.typography.fonts.heading,
                  fontWeight: 700,
                  fontSize: "24px",
                  color: "#f1f5f9",
                  mb: 0.5
                }}
              >
                Ready to join?
              </Typography>
              {roomCode && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                  <Chip label={roomCode} />
                  <Tooltip title="Copy link">
                    <IconButton variant="ghost" size="small" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                      <ContentCopyOutlinedIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>

            <Box sx={{ "& .MuiBox-root": { mb: 0 } }}>
              <Input
                label="Your display name"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </Box>

            <DeviceSelector
              label="Camera"
              devices={videoDevices}
              value={selectedCamera}
              onChange={onSwitchCamera}
            />

            <DeviceSelector
              label="Microphone"
              devices={audioInputDevices}
              value={selectedMicrophone}
              onChange={onSwitchMicrophone}
            />

            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
              <Box sx={{ flex: 1 }}>
                <DeviceSelector
                  label="Speaker"
                  devices={audioOutputDevices}
                  value={selectedSpeaker}
                  onChange={onSwitchSpeaker}
                />
              </Box>
              <Button
                variant="secondary"
                size="normal"
                onClick={() => playChime("beep")}
                leftIcon={<VolumeUpOutlinedIcon />}
                sx={{ whiteSpace: "nowrap" }}
              >
                Test speaker
              </Button>
            </Box>

            {lobbyParticipants.length > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 0.5 }}>
                <AvatarGroup max={4}>
                  {lobbyParticipants.map((p, i) => (
                    <Avatar key={i} src={p.avatar} sx={{ width: 28, height: 28, bgcolor: getAvatarColor(p.name), fontSize: "12px" }}>
                      {getInitials(p.name)}
                    </Avatar>
                  ))}
                </AvatarGroup>
                <Typography sx={{ fontSize: "13px", color: "#94a3b8" }}>
                  {lobbyParticipants.length} {lobbyParticipants.length === 1 ? "person" : "people"} in room
                </Typography>
              </Box>
            )}

            {/* Mobile Sticky / Desktop CTA Join Button */}
            <Box
              sx={{
                position: { xs: "sticky", md: "static" },
                bottom: 0,
                pt: 1,
                bgcolor: { xs: callTokens.tileBg, md: "transparent" },
                zIndex: 10
              }}
            >
              <Button
                variant="primary"
                size="large"
                fullWidth
                disabled={!username?.trim()}
                onClick={onJoinMeeting}
              >
                Join meeting
              </Button>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
