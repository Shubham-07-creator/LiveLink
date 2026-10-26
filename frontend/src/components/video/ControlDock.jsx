import React, { useState, useEffect, useRef } from "react";
import { Box, Tooltip, Badge, Menu, MenuItem, ListItemIcon, ListItemText, useMediaQuery } from "@mui/material";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import MicOffOutlinedIcon from "@mui/icons-material/MicOffOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import VideocamOffOutlinedIcon from "@mui/icons-material/VideocamOffOutlined";
import ScreenShareOutlinedIcon from "@mui/icons-material/ScreenShareOutlined";
import StopScreenShareOutlinedIcon from "@mui/icons-material/StopScreenShareOutlined";
import PanToolOutlinedIcon from "@mui/icons-material/PanToolOutlined";
import AddReactionOutlinedIcon from "@mui/icons-material/AddReactionOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import StopOutlinedIcon from "@mui/icons-material/StopOutlined";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import ViewStreamOutlinedIcon from "@mui/icons-material/ViewStreamOutlined";
import ClosedCaptionOutlinedIcon from "@mui/icons-material/ClosedCaptionOutlined";
import ClosedCaptionDisabledOutlinedIcon from "@mui/icons-material/ClosedCaptionDisabledOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import CallEndOutlinedIcon from "@mui/icons-material/CallEndOutlined";
import MoreVertOutlinedIcon from "@mui/icons-material/MoreVertOutlined";

import { IconButton } from "../ui";
import tokens from "../../tokens";

export default function ControlDock({
  videoEnabled,
  audioEnabled,
  isScreenSharing,
  isHandRaised,
  isRecording,
  isHost,
  viewMode,
  captionsActive,
  unreadMessages = 0,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleHand,
  onSendReaction,
  onToggleViewMode,
  onToggleCaptions,
  onToggleChat,
  onTogglePeople,
  onToggleRecording,
  onOpenSettings,
  onLeaveCall,
  onActivity
}) {
  const isMobile = useMediaQuery("(max-width:600px)");
  const [isVisible, setIsVisible] = useState(true);
  const [reactionAnchor, setReactionAnchor] = useState(null);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const timerRef = useRef(null);

  const callTokens = tokens.colors.call;

  useEffect(() => {
    if (isMobile) {
      setIsVisible(true);
      onActivity?.(true);
      return;
    }

    const resetTimer = () => {
      setIsVisible(true);
      onActivity?.(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!reactionAnchor && !moreAnchor) {
          setIsVisible(false);
          onActivity?.(false);
        }
      }, 3000);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("touchstart", resetTimer);

    resetTimer();

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isMobile, reactionAnchor, moreAnchor, onActivity]);

  const reactions = ["👍", "❤️", "👏", "😂", "🎉"];

  return (
    <Box
      sx={{
        position: isMobile ? "fixed" : "absolute",
        bottom: isMobile ? 0 : 20,
        left: isMobile ? 0 : "50%",
        transform: isMobile ? "none" : "translateX(-50%)",
        width: isMobile ? "100%" : "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.25,
        px: isMobile ? 1.5 : 2.5,
        py: 1.25,
        borderRadius: isMobile ? 0 : tokens.radii.modal,
        bgcolor: callTokens.dockBg,
        backdropFilter: "blur(16px)",
        border: isMobile ? "none" : `1px solid ${callTokens.dockBorder}`,
        borderTop: isMobile ? `1px solid ${callTokens.dockBorder}` : undefined,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "auto" : "none",
        transition: `opacity ${tokens.motion.micro}`,
        zIndex: 30
      }}
    >
      {/* Mic toggle */}
      <Tooltip title={audioEnabled ? "Turn off mic (M)" : "Turn on mic (M)"}>
        <IconButton
          variant={audioEnabled ? "ghost" : "danger"}
          size={isMobile ? "large" : "normal"}
          shape="round"
          onClick={onToggleAudio}
          ariaLabel={audioEnabled ? "Turn off mic" : "Turn on mic"}
          sx={{
            bgcolor: audioEnabled ? callTokens.dockIconNormal : callTokens.offState,
            color: "#ffffff",
            "&:hover": { bgcolor: audioEnabled ? callTokens.dockIconHover : callTokens.offStateHover }
          }}
        >
          {audioEnabled ? <MicNoneOutlinedIcon sx={{ fontSize: 24 }} /> : <MicOffOutlinedIcon sx={{ fontSize: 24 }} />}
        </IconButton>
      </Tooltip>

      {/* Camera toggle */}
      <Tooltip title={videoEnabled ? "Turn off camera (V)" : "Turn on camera (V)"}>
        <IconButton
          variant={videoEnabled ? "ghost" : "danger"}
          size={isMobile ? "large" : "normal"}
          shape="round"
          onClick={onToggleVideo}
          ariaLabel={videoEnabled ? "Turn off camera" : "Turn on camera"}
          sx={{
            bgcolor: videoEnabled ? callTokens.dockIconNormal : callTokens.offState,
            color: "#ffffff",
            "&:hover": { bgcolor: videoEnabled ? callTokens.dockIconHover : callTokens.offStateHover }
          }}
        >
          {videoEnabled ? <VideocamOutlinedIcon sx={{ fontSize: 24 }} /> : <VideocamOffOutlinedIcon sx={{ fontSize: 24 }} />}
        </IconButton>
      </Tooltip>

      {/* Desktop items */}
      {!isMobile && (
        <>
          <Tooltip title={isScreenSharing ? "Stop sharing screen" : "Share screen"}>
            <IconButton
              size="normal"
              shape="round"
              onClick={onToggleScreenShare}
              sx={{
                bgcolor: isScreenSharing ? tokens.colors.light.primary : callTokens.dockIconNormal,
                color: "#ffffff",
                "&:hover": { bgcolor: isScreenSharing ? tokens.colors.light.primaryHover : callTokens.dockIconHover }
              }}
            >
              {isScreenSharing ? <StopScreenShareOutlinedIcon sx={{ fontSize: 24 }} /> : <ScreenShareOutlinedIcon sx={{ fontSize: 24 }} />}
            </IconButton>
          </Tooltip>

          <Tooltip title={isHandRaised ? "Lower hand (H)" : "Raise hand (H)"}>
            <IconButton
              size="normal"
              shape="round"
              onClick={onToggleHand}
              sx={{
                bgcolor: isHandRaised ? callTokens.raiseHandBg : callTokens.dockIconNormal,
                color: isHandRaised ? callTokens.raiseHandColor : "#ffffff",
                "&:hover": { bgcolor: isHandRaised ? "#d97706" : callTokens.dockIconHover }
              }}
            >
              <PanToolOutlinedIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Send reaction">
            <IconButton
              size="normal"
              shape="round"
              onClick={(e) => setReactionAnchor(e.currentTarget)}
              sx={{ bgcolor: callTokens.dockIconNormal, color: "#ffffff", "&:hover": { bgcolor: callTokens.dockIconHover } }}
            >
              <AddReactionOutlinedIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title={viewMode === "grid" ? "Switch to speaker view" : "Switch to grid view"}>
            <IconButton
              size="normal"
              shape="round"
              onClick={onToggleViewMode}
              sx={{ bgcolor: callTokens.dockIconNormal, color: "#ffffff", "&:hover": { bgcolor: callTokens.dockIconHover } }}
            >
              {viewMode === "grid" ? <ViewStreamOutlinedIcon sx={{ fontSize: 22 }} /> : <GridViewOutlinedIcon sx={{ fontSize: 22 }} />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Subtitles (Beta, Chrome only)">
            <IconButton
              size="normal"
              shape="round"
              onClick={onToggleCaptions}
              sx={{
                bgcolor: captionsActive ? tokens.colors.light.primary : callTokens.dockIconNormal,
                color: "#ffffff",
                "&:hover": { bgcolor: captionsActive ? tokens.colors.light.primaryHover : callTokens.dockIconHover }
              }}
            >
              {captionsActive ? <ClosedCaptionOutlinedIcon sx={{ fontSize: 22 }} /> : <ClosedCaptionDisabledOutlinedIcon sx={{ fontSize: 22 }} />}
            </IconButton>
          </Tooltip>

          {isHost && (
            <Tooltip title={isRecording ? "Stop recording (Saved on device)" : "Record meeting (Saved on device)"}>
              <IconButton
                size="normal"
                shape="round"
                onClick={onToggleRecording}
                sx={{
                  bgcolor: isRecording ? callTokens.offState : callTokens.dockIconNormal,
                  color: "#ffffff",
                  "&:hover": { bgcolor: isRecording ? callTokens.offStateHover : callTokens.dockIconHover }
                }}
              >
                {isRecording ? <StopOutlinedIcon sx={{ fontSize: 22 }} /> : <FiberManualRecordIcon sx={{ color: tokens.accent.dotRed, fontSize: 20 }} />}
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="People">
            <IconButton
              size="normal"
              shape="round"
              onClick={onTogglePeople}
              sx={{ bgcolor: callTokens.dockIconNormal, color: "#ffffff", "&:hover": { bgcolor: callTokens.dockIconHover } }}
            >
              <GroupsOutlinedIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Device settings">
            <IconButton
              size="normal"
              shape="round"
              onClick={onOpenSettings}
              sx={{ bgcolor: callTokens.dockIconNormal, color: "#ffffff", "&:hover": { bgcolor: callTokens.dockIconHover } }}
            >
              <SettingsOutlinedIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>
        </>
      )}

      {/* In-Call Chat button */}
      <Tooltip title="In-call chat (C)">
        <IconButton
          size={isMobile ? "large" : "normal"}
          shape="round"
          onClick={onToggleChat}
          sx={{ bgcolor: callTokens.dockIconNormal, color: "#ffffff", "&:hover": { bgcolor: callTokens.dockIconHover } }}
        >
          <Badge badgeContent={unreadMessages} color="primary">
            <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 22 }} />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Mobile More options */}
      {isMobile && (
        <IconButton
          size="large"
          shape="round"
          onClick={(e) => setMoreAnchor(e.currentTarget)}
          sx={{ bgcolor: callTokens.dockIconNormal, color: "#ffffff", "&:hover": { bgcolor: callTokens.dockIconHover } }}
        >
          <MoreVertOutlinedIcon sx={{ fontSize: 22 }} />
        </IconButton>
      )}

      {/* Leave button: Prominent pill with white text & icon on desktop, icon only on mobile */}
      <Box
        component="button"
        onClick={onLeaveCall}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          height: tokens.buttonHeights.normal,
          px: isMobile ? 1.5 : 2.5,
          borderRadius: tokens.radii.badge,
          border: "none",
          bgcolor: callTokens.leaveBtn,
          color: "#ffffff",
          fontFamily: tokens.typography.fonts.body,
          fontWeight: 600,
          fontSize: "14px",
          cursor: "pointer",
          transition: `all ${tokens.motion.micro}`,
          "&:hover": { bgcolor: callTokens.leaveBtnHover }
        }}
      >
        <CallEndOutlinedIcon sx={{ fontSize: 20 }} />
        {!isMobile && <span>Leave</span>}
      </Box>

      {/* Emoji reactions popover (emojis only for call reactions) */}
      <Menu
        anchorEl={reactionAnchor}
        open={Boolean(reactionAnchor)}
        onClose={() => setReactionAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: tokens.colors.dark.surface,
              borderRadius: tokens.radii.card,
              border: `1px solid ${tokens.colors.dark.border}`,
              p: 0.5
            }
          }
        }}
      >
        <Box sx={{ display: "flex", gap: 0.5, px: 1 }}>
          {reactions.map((emoji) => (
            <IconButton
              key={emoji}
              variant="ghost"
              size="normal"
              shape="round"
              onClick={() => {
                onSendReaction?.(emoji);
                setReactionAnchor(null);
              }}
              sx={{ fontSize: "1.4rem" }}
            >
              {emoji}
            </IconButton>
          ))}
        </Box>
      </Menu>

      {/* Mobile More Actions Menu */}
      <Menu
        anchorEl={moreAnchor}
        open={Boolean(moreAnchor)}
        onClose={() => setMoreAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: tokens.colors.dark.surface,
              color: "#ffffff",
              borderRadius: tokens.radii.card,
              border: `1px solid ${tokens.colors.dark.border}`,
              minWidth: 200
            }
          }
        }}
      >
        <MenuItem onClick={() => { onTogglePeople?.(); setMoreAnchor(null); }}>
          <ListItemIcon><GroupsOutlinedIcon sx={{ color: "#ffffff" }} /></ListItemIcon>
          <ListItemText>People</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onToggleHand(); setMoreAnchor(null); }}>
          <ListItemIcon><PanToolOutlinedIcon sx={{ color: isHandRaised ? "#f59e0b" : "#ffffff" }} /></ListItemIcon>
          <ListItemText>{isHandRaised ? "Lower hand" : "Raise hand"}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onToggleViewMode(); setMoreAnchor(null); }}>
          <ListItemIcon><GridViewOutlinedIcon sx={{ color: "#ffffff" }} /></ListItemIcon>
          <ListItemText>{viewMode === "grid" ? "Speaker view" : "Grid view"}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onToggleCaptions(); setMoreAnchor(null); }}>
          <ListItemIcon><ClosedCaptionOutlinedIcon sx={{ color: "#ffffff" }} /></ListItemIcon>
          <ListItemText>Captions (Beta)</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { onOpenSettings(); setMoreAnchor(null); }}>
          <ListItemIcon><SettingsOutlinedIcon sx={{ color: "#ffffff" }} /></ListItemIcon>
          <ListItemText>Device settings</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
