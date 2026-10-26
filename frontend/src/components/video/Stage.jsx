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
  const callTokens = tokens.colors.call;

  // Collect all participants into a normalized list
  const participants = [
    {
      socketId: "local",
      stream: localStream,
      name: localName,
      avatar: localAvatar,
      isLocal: true,
      isVideoOff: !videoEnabled,
      isMuted: !audioEnabled,
      isSpeaking: Boolean(localSpeaking),
      isHandRaised: Boolean(isLocalHandRaised),
      quality: overallQuality
    },
    ...remoteVideos.map((r) => ({
      socketId: r.socketId,
      stream: r.stream,
      name: r.name || "Participant",
      avatar: r.avatar,
      isLocal: false,
      isVideoOff: !r.videoEnabled,
      isMuted: false,
      isSpeaking: Boolean(activeSpeakingPeers[r.socketId]),
      isHandRaised: Boolean(raisedHands[r.socketId]),
      quality: peerQualities[r.socketId]?.quality || overallQuality
    }))
  ];

  // Determine hero participant for speaker view
  let heroParticipant = null;
  if (pinnedUser) {
    heroParticipant = participants.find((p) => p.socketId === pinnedUser);
  } else if (spotlightUser) {
    heroParticipant = participants.find((p) => p.socketId === spotlightUser);
  } else {
    heroParticipant =
      participants.find((p) => p.isSpeaking && !p.isLocal) ||
      participants.find((p) => !p.isLocal) ||
      participants[0];
  }

  const isHeroLayout = (viewMode === "speaker" || isScreenSharing) && heroParticipant;
  const thumbnailParticipants = participants.filter((p) => p.socketId !== heroParticipant?.socketId);

  // Dynamic grid layout for up to 4 participants
  const totalTiles = participants.length;
  const getGridColumns = () => {
    if (totalTiles <= 1) return "1fr";
    if (totalTiles === 2) return { xs: "1fr", sm: "repeat(2, 1fr)" };
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
        p: 2, // 16px min padding
        pt: 9, // Space for top bar
        pb: 11, // Space for bottom dock
        gap: 2, // 16px gap
        bgcolor: callTokens.stageBg
      }}
    >
      {/* Screen Share Hero Tile if active */}
      {isScreenSharing && screenStream && (
        <Box sx={{ flex: 1, minHeight: 0, borderRadius: tokens.radii.tile, overflow: "hidden", bgcolor: "#000000" }}>
          <VideoTile
            stream={screenStream}
            name={`${localName}'s screen`}
            isLocal={true}
            isMuted={true}
            isVideoOff={false}
            isSpeaking={false}
            networkQuality={overallQuality}
          />
        </Box>
      )}

      {/* Speaker View: Large Hero Tile + Bottom Thumbnails */}
      {isHeroLayout && !isScreenSharing && (
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 2 }}>
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <VideoTile
              stream={heroParticipant.stream}
              name={heroParticipant.name}
              avatar={heroParticipant.avatar}
              isLocal={heroParticipant.isLocal}
              isVideoOff={heroParticipant.isVideoOff}
              isMuted={heroParticipant.isMuted}
              isSpeaking={heroParticipant.isSpeaking}
              isPinned={pinnedUser === heroParticipant.socketId}
              isSpotlighted={spotlightUser === heroParticipant.socketId}
              isHandRaised={heroParticipant.isHandRaised}
              networkQuality={heroParticipant.quality}
              onPin={() => onPinUser?.(pinnedUser === heroParticipant.socketId ? null : heroParticipant.socketId)}
              onSpotlight={() => onSpotlightUser?.(heroParticipant.socketId)}
            />
          </Box>
          {thumbnailParticipants.length > 0 && (
            <Box sx={{ height: "130px", display: "flex", gap: 2, overflowX: "auto", py: 0.5 }}>
              {thumbnailParticipants.map((part) => (
                <Box key={part.socketId} sx={{ width: "200px", height: "100%", flexShrink: 0 }}>
                  <VideoTile
                    stream={part.stream}
                    name={part.name}
                    avatar={part.avatar}
                    isLocal={part.isLocal}
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
      )}

      {/* Grid View: Responsive 1 to 4 Tiles */}
      {!isHeroLayout && !isScreenSharing && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: getGridColumns(),
            gridTemplateRows: totalTiles > 2 ? "repeat(2, 1fr)" : "1fr",
            gap: 2, // 16px strictly
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
