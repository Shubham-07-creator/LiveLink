import React from "react";
import Box from "@mui/material/Box";
import VideoTile from "./VideoTile";
import tokens from "../../tokens";

export default function Stage({
  localStream,
  screenStream,
  isScreenSharing,
  remoteVideos = [],
  localName = "You",
  localAvatar,
  localSocketId,
  hostSocketId,
  videoEnabled,
  audioEnabled,
  localSpeaking,
  activeSpeakingPeers = {},
  peerQualities = {},
  overallQuality = "Good",
  raisedHands = {},
  isLocalHandRaised = false,
  viewMode = "grid", // 'grid' | 'speaker'
  pinnedUser = null,
  spotlightUser = null,
  onPinUser,
  onSpotlightUser
}) {
  const callTokens = tokens?.colors?.call || tokens?.call || {};

  // Collect all participants into a normalized list (filtering out self-duplicates)
  const filteredRemoteVideos = remoteVideos.filter(
    (r) => r.socketId !== "local" && (!localSocketId || r.socketId !== localSocketId)
  );

  const participants = [
    {
      socketId: "local",
      stream: localStream,
      name: localName,
      avatar: localAvatar,
      isLocal: true,
      isHost: Boolean(hostSocketId && localSocketId && hostSocketId === localSocketId),
      isVideoOff: !videoEnabled,
      isMuted: !audioEnabled,
      isSpeaking: Boolean(localSpeaking),
      isHandRaised: Boolean(isLocalHandRaised),
      quality: overallQuality
    },
    ...filteredRemoteVideos.map((r) => ({
      socketId: r.socketId,
      stream: r.stream,
      name: r.name || "Participant",
      avatar: r.avatar,
      isLocal: false,
      isHost: Boolean(hostSocketId && r.socketId === hostSocketId),
      isVideoOff: !r.videoEnabled,
      isMuted: false,
      isSpeaking: Boolean(activeSpeakingPeers[r.socketId]),
      isHandRaised: Boolean(raisedHands[r.socketId]),
      quality: peerQualities[r.socketId]?.quality || overallQuality
    }))
  ];

  // Check if a remote participant is currently sharing their screen
  const remoteScreenParticipant = participants.find((p) => {
    if (p.isLocal) return false;
    const track = p.stream?.getVideoTracks?.()[0];
    return Boolean(
      track?.getSettings?.()?.displaySurface !== undefined ||
      /screen|window|monitor|display/i.test(track?.label || "")
    );
  });

  // Determine hero participant for speaker view or remote screen share presentation
  let heroParticipant = null;
  if (pinnedUser) {
    heroParticipant = participants.find((p) => p.socketId === pinnedUser);
  } else if (spotlightUser) {
    heroParticipant = participants.find((p) => p.socketId === spotlightUser);
  } else if (remoteScreenParticipant) {
    heroParticipant = remoteScreenParticipant;
  } else {
    heroParticipant =
      participants.find((p) => p.isSpeaking && !p.isLocal) ||
      participants.find((p) => !p.isLocal) ||
      participants[0];
  }

  const isHeroLayout = (viewMode === "speaker" || Boolean(remoteScreenParticipant)) && heroParticipant;
  const thumbnailParticipants = participants.filter((p) => p.socketId !== heroParticipant?.socketId);

  // Dynamic grid layout for up to 4 participants
  const totalTiles = participants.length;
  const getGridColumns = () => {
    if (totalTiles <= 1) return "1fr";
    if (totalTiles === 2) return { xs: "1fr", sm: "repeat(2, 1fr)" };
    return "repeat(2, 1fr)";
  };

  const getGridRows = () => {
    if (totalTiles <= 1) return "1fr";
    if (totalTiles === 2) return { xs: "repeat(2, 1fr)", sm: "1fr" };
    return "repeat(2, 1fr)";
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        p: { xs: 1, sm: 2 },
        pt: { xs: "calc(56px + env(safe-area-inset-top, 0px))", sm: 9 }, // Space for top bar
        pb: { xs: "calc(72px + env(safe-area-inset-bottom, 0px))", sm: 11 }, // Space for bottom dock
        gap: { xs: 1, sm: 2 },
        bgcolor: callTokens.stageBg
      }}
    >
      {/* 1. When Local User is Sharing Screen: Large Hero Screen Share + Bottom Thumbnails of All Participants */}
      {isScreenSharing && screenStream ? (
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: { xs: 1, sm: 2 } }}>
          <Box sx={{ flex: 1, minHeight: 0, borderRadius: tokens.radii.tile, overflow: "hidden", bgcolor: "#000000" }}>
            <VideoTile
              stream={screenStream}
              name={`${localName}'s screen (Sharing)`}
              isLocal={true}
              isMuted={true}
              isVideoOff={false}
              isSpeaking={false}
              isScreenShare={true}
              networkQuality={overallQuality}
            />
          </Box>
          {participants.length > 0 && (
            <Box sx={{ height: { xs: "90px", sm: "125px" }, display: "flex", gap: 1.5, overflowX: "auto", py: 0.5, flexShrink: 0 }}>
              {participants.map((part) => (
                <Box key={part.socketId} sx={{ width: { xs: "130px", sm: "180px" }, height: "100%", flexShrink: 0 }}>
                  <VideoTile
                    stream={part.stream}
                    name={part.name}
                    avatar={part.avatar}
                    isLocal={part.isLocal}
                    isHost={part.isHost}
                    isVideoOff={part.isVideoOff}
                    isMuted={part.isMuted}
                    isSpeaking={part.isSpeaking}
                    isPinned={pinnedUser === part.socketId}
                    isSpotlighted={spotlightUser === part.socketId}
                    isHandRaised={part.isHandRaised}
                    networkQuality={part.quality}
                    onPin={() => onPinUser?.(pinnedUser === part.socketId ? null : part.socketId)}
                    onSpotlight={() => onSpotlightUser?.(part.socketId)}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ) : isHeroLayout ? (
        /* 2. Speaker View / Remote Screen Share Hero View + Bottom Thumbnails */
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 2 }}>
          <Box sx={{ flex: 1, minHeight: 0, borderRadius: tokens.radii.tile, overflow: "hidden", bgcolor: "#000000" }}>
            <VideoTile
              stream={heroParticipant.stream}
              name={heroParticipant === remoteScreenParticipant ? `${heroParticipant.name}'s screen` : heroParticipant.name}
              avatar={heroParticipant.avatar}
              isLocal={heroParticipant.isLocal}
              isHost={heroParticipant.isHost}
              isVideoOff={heroParticipant.isVideoOff}
              isMuted={heroParticipant.isMuted}
              isSpeaking={heroParticipant.isSpeaking}
              isPinned={pinnedUser === heroParticipant.socketId}
              isSpotlighted={spotlightUser === heroParticipant.socketId}
              isHandRaised={heroParticipant.isHandRaised}
              isScreenShare={heroParticipant === remoteScreenParticipant}
              networkQuality={heroParticipant.quality}
              onPin={() => onPinUser?.(pinnedUser === heroParticipant.socketId ? null : heroParticipant.socketId)}
              onSpotlight={() => onSpotlightUser?.(heroParticipant.socketId)}
            />
          </Box>
          {thumbnailParticipants.length > 0 && (
            <Box sx={{ height: { xs: "90px", sm: "125px" }, display: "flex", gap: 1.5, overflowX: "auto", py: 0.5, flexShrink: 0 }}>
              {thumbnailParticipants.map((part) => (
                <Box key={part.socketId} sx={{ width: { xs: "130px", sm: "180px" }, height: "100%", flexShrink: 0 }}>
                  <VideoTile
                    stream={part.stream}
                    name={part.name}
                    avatar={part.avatar}
                    isLocal={part.isLocal}
                    isHost={part.isHost}
                    isVideoOff={part.isVideoOff}
                    isMuted={part.isMuted}
                    isSpeaking={part.isSpeaking}
                    isPinned={pinnedUser === part.socketId}
                    isSpotlighted={spotlightUser === part.socketId}
                    isHandRaised={part.isHandRaised}
                    networkQuality={part.quality}
                    onPin={() => onPinUser?.(pinnedUser === part.socketId ? null : part.socketId)}
                    onSpotlight={() => onSpotlightUser?.(part.socketId)}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      ) : (
        /* 3. Grid View: Responsive 1 to 4 Tiles (When no screen share) */
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: getGridColumns(),
            gridTemplateRows: getGridRows(),
            gap: { xs: 1, sm: 2 },
            width: "100%",
            height: "100%"
          }}
        >
          {participants.map((part) => (
            <Box key={part.socketId} sx={{ width: "100%", height: "100%", minHeight: 0 }}>
              <VideoTile
                stream={part.stream}
                name={part.name}
                avatar={part.avatar}
                isLocal={part.isLocal}
                isHost={part.isHost}
                isVideoOff={part.isVideoOff}
                isMuted={part.isMuted}
                isSpeaking={part.isSpeaking}
                isPinned={pinnedUser === part.socketId}
                isSpotlighted={spotlightUser === part.socketId}
                isHandRaised={part.isHandRaised}
                networkQuality={part.quality}
                onPin={() => onPinUser?.(pinnedUser === part.socketId ? null : part.socketId)}
                onSpotlight={() => onSpotlightUser?.(part.socketId)}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
