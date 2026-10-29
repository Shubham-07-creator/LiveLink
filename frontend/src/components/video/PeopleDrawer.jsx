import React from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import ListItemSecondaryAction from "@mui/material/ListItemSecondaryAction";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";

import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import MicOffOutlinedIcon from "@mui/icons-material/MicOffOutlined";
import VideocamOffOutlinedIcon from "@mui/icons-material/VideocamOffOutlined";
import PersonRemoveOutlinedIcon from "@mui/icons-material/PersonRemoveOutlined";
import PanToolOutlinedIcon from "@mui/icons-material/PanToolOutlined";

import HostPanel from "./HostPanel";
import { getInitials, getAvatarColor } from "../../utils/audioChimes";
import tokens from "../../tokens";

export default function PeopleDrawer({
  open,
  onClose,
  participants = [],
  isHost = false,
  isRoomLocked = false,
  roomPermissions = { allowScreenShare: true, allowChat: true },
  waitingUsers = [],
  aiSummaryEnabled = false,
  onLockRoom,
  onMuteAll,
  onToggleScreenSharePermission,
  onToggleChatPermission,
  onToggleAiSummary,
  onGenerateAiSummary,
  isGeneratingAiSummary = false,
  onEndMeetingForAll,
  onAdmitUser,
  onDenyUser,
  onMuteParticipant,
  onForceStopVideo,
  onRemoveParticipant
}) {
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
          People ({participants.length})
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: "#94a3b8", "&:hover": { color: "#ffffff" } }}>
          <CloseOutlinedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* Content Area */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
        {/* Host Control Panel */}
        {isHost && (
          <HostPanel
            isRoomLocked={isRoomLocked}
            waitingUsers={waitingUsers}
            roomPermissions={roomPermissions}
            aiSummaryEnabled={aiSummaryEnabled}
            onLockRoom={onLockRoom}
            onMuteAll={onMuteAll}
            onToggleScreenSharePermission={onToggleScreenSharePermission}
            onToggleChatPermission={onToggleChatPermission}
            onToggleAiSummary={onToggleAiSummary}
            onGenerateAiSummary={onGenerateAiSummary}
            isGeneratingAiSummary={isGeneratingAiSummary}
            onEndMeetingForAll={onEndMeetingForAll}
            onAdmitUser={onAdmitUser}
            onDenyUser={onDenyUser}
          />
        )}

        {/* Participants List */}
        <List sx={{ p: 0 }}>
          {participants.map((p, idx) => (
            <ListItem
              key={p.socketId || idx}
              sx={{
                px: 1.5,
                py: 1,
                borderRadius: tokens.radii.button,
                "&:hover": { bgcolor: "rgba(255, 255, 255, 0.04)" }
              }}
            >
              <ListItemAvatar>
                <Avatar
                  src={p.avatar}
                  sx={{
                    bgcolor: getAvatarColor(p.name),
                    width: 36,
                    height: 36,
                    fontSize: "14px",
                    fontWeight: 700
                  }}
                >
                  {getInitials(p.name)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}>
                      {p.name} {p.isLocal && "(You)"}
                    </Typography>
                    {p.isHost && (
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.3,
                          px: 0.8,
                          py: 0.2,
                          borderRadius: "4px",
                          bgcolor: "rgba(245, 158, 11, 0.2)",
                          color: "#fbbf24",
                          fontSize: "11px",
                          fontWeight: 700,
                          border: "1px solid rgba(245, 158, 11, 0.4)"
                        }}
                      >
                        👑 Host
                      </Box>
                    )}
                    {p.isHandRaised && (
                      <Tooltip title="Hand raised">
                        <PanToolOutlinedIcon sx={{ fontSize: "15px", color: tokens.colors.call.raiseHandBg }} />
                      </Tooltip>
                    )}
                  </Box>
                }
              />
              {isHost && !p.isLocal && (
                <ListItemSecondaryAction>
                  <Tooltip title="Mute participant">
                    <IconButton size="small" onClick={() => onMuteParticipant?.(p.socketId)} sx={{ color: "#94a3b8" }}>
                      <MicOffOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Turn off camera">
                    <IconButton size="small" onClick={() => onForceStopVideo?.(p.socketId)} sx={{ color: "#94a3b8" }}>
                      <VideocamOffOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove participant">
                    <IconButton size="small" onClick={() => onRemoveParticipant?.(p.socketId)} sx={{ color: tokens.colors.light.danger }}>
                      <PersonRemoveOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
}
