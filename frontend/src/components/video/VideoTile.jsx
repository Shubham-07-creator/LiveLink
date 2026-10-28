import React, { useRef, useEffect } from "react";
import { Box, Typography, IconButton, Tooltip, Avatar } from "@mui/material";
import MicOffOutlinedIcon from "@mui/icons-material/MicOffOutlined";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import PushPinIcon from "@mui/icons-material/PushPin";
import PictureInPictureAltOutlinedIcon from "@mui/icons-material/PictureInPictureAltOutlined";
import PanToolOutlinedIcon from "@mui/icons-material/PanToolOutlined";
import SignalCellularAltOutlinedIcon from "@mui/icons-material/SignalCellularAltOutlined";
import { getInitials, getAvatarColor } from "../../utils/audioChimes";
import tokens from "../../tokens";

export default function VideoTile({
  stream,
  name,
  avatar,
  isLocal,
  isMuted,
  isVideoOff,
  isSpeaking,
  isPinned,
  isSpotlighted,
  isHandRaised,
  networkQuality = "Good",
  onPin,
  onSpotlight
}) {
  const videoRef = useRef(null);
  const callTokens = tokens?.colors?.call || tokens?.call || {};

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream) return;

    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }

    const playVideo = () => {
      videoEl.play().catch((err) => {
        // Autoplay policy or pause - harmless warning
        console.warn("[VideoTile] Play deferred or pending gesture:", err?.message);
      });
    };

    videoEl.onloadedmetadata = playVideo;
    playVideo();

    return () => {
      if (videoEl) videoEl.onloadedmetadata = null;
    };
  }, [stream]);

  const handlePiP = async (e) => {
    e.stopPropagation();
    if (videoRef.current && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.warn("PiP error:", err);
      }
    }
  };

  const getQualityColor = () => {
    if (networkQuality === "Poor") return tokens?.accent?.dotRed || tokens?.colors?.accent?.dotRed || "#ef4444";
    if (networkQuality === "Weak") return tokens?.accent?.dotAmber || tokens?.colors?.accent?.dotAmber || "#f59e0b";
    return tokens?.accent?.dotGreen || tokens?.colors?.accent?.dotGreen || "#16a34a";
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: tokens.radii.tile,
        overflow: "hidden",
        backgroundColor: callTokens.tileBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: isSpeaking
          ? `2px solid ${callTokens.activeSpeaker}`
          : isSpotlighted
          ? "2px solid #f59e0b"
          : "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: isSpeaking ? callTokens.activeSpeakerGlow : "none",
        transition: `border 0.2s ease, box-shadow 0.2s ease`
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: isLocal ? "scaleX(-1)" : "none",
          display: isVideoOff ? "none" : "block"
        }}
      />

      {/* Initials Avatar fallback when camera is off */}
      {isVideoOff && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Avatar
            src={avatar || undefined}
            sx={{
              width: 72,
              height: 72,
              bgcolor: getAvatarColor(name),
              fontSize: "24px",
              fontWeight: 700,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)"
            }}
          >
            {getInitials(name)}
          </Avatar>
        </Box>
      )}

      {/* Top Left: Pinned & Raised Hand Badges */}
      <Box sx={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 1, zIndex: 5 }}>
        {isHandRaised && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.2,
              py: 0.4,
              borderRadius: tokens.radii.badge,
              bgcolor: callTokens.raiseHandBg,
              color: callTokens.raiseHandColor,
              fontWeight: 700,
              fontSize: "12px"
            }}
          >
            <PanToolOutlinedIcon sx={{ fontSize: "14px" }} />
            <span>Hand raised</span>
          </Box>
        )}
        {isPinned && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: "50%",
              bgcolor: "rgba(15, 23, 42, 0.75)",
              color: "#60a5fa",
              backdropFilter: "blur(4px)"
            }}
          >
            <PushPinIcon sx={{ fontSize: 16 }} />
          </Box>
        )}
      </Box>

      {/* Top Right: Network Quality Badge & PiP / Pin Buttons */}
      <Box sx={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 0.8, zIndex: 5 }}>
        {networkQuality && (
          <Tooltip title={`Network: ${networkQuality}`}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 1,
                py: 0.3,
                borderRadius: tokens.radii.badge,
                bgcolor: "rgba(15, 23, 42, 0.75)",
                backdropFilter: "blur(4px)",
                color: getQualityColor(),
                fontSize: "12px",
                fontWeight: 600,
                border: "1px solid rgba(255, 255, 255, 0.08)"
              }}
            >
              <SignalCellularAltOutlinedIcon sx={{ fontSize: "15px" }} />
              <span>{networkQuality}</span>
            </Box>
          </Tooltip>
        )}

        {onPin && (
          <Tooltip title={isPinned ? "Unpin tile" : "Pin tile"}>
            <IconButton
              size="small"
              onClick={onPin}
              sx={{
                bgcolor: "rgba(15, 23, 42, 0.75)",
                color: isPinned ? "#60a5fa" : "#ffffff",
                backdropFilter: "blur(4px)",
                "&:hover": { bgcolor: "rgba(15, 23, 42, 0.95)" }
              }}
              aria-label="Pin video"
            >
              {isPinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}

        {document.pictureInPictureEnabled && !isVideoOff && (
          <Tooltip title="Picture in picture">
            <IconButton
              size="small"
              onClick={handlePiP}
              sx={{
                bgcolor: "rgba(15, 23, 42, 0.75)",
                color: "#ffffff",
                backdropFilter: "blur(4px)",
                "&:hover": { bgcolor: "rgba(15, 23, 42, 0.95)" }
              }}
              aria-label="Picture in picture"
            >
              <PictureInPictureAltOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Bottom Left: Glass Pill Name Tag */}
      <Box
        sx={{
          position: "absolute",
          bottom: 12,
          left: 12,
          display: "flex",
          alignItems: "center",
          gap: 0.8,
          bgcolor: "rgba(15, 23, 42, 0.75)",
          px: 1.4,
          py: 0.5,
          borderRadius: tokens.radii.badge,
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          zIndex: 5
        }}
      >
        <Typography
          sx={{
            color: tokens.typography.tileName.color,
            fontSize: tokens.typography.tileName.fontSize,
            fontWeight: tokens.typography.tileName.weight
          }}
        >
          {name} {isLocal && "(You)"}
        </Typography>
        {isMuted && (
          <MicOffOutlinedIcon sx={{ color: callTokens.offState, fontSize: 16 }} />
        )}
      </Box>
    </Box>
  );
}
