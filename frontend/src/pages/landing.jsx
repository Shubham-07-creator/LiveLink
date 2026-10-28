import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { useThemeMode } from "../contexts/ThemeContext";
import { generateRoomCode } from "../utils/roomCode";
import {
  Button,
  IconButton,
  Card,
  Input,
  Badge,
  Modal,
  Toast
} from "../components/ui";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";

import VideoCallOutlinedIcon from "@mui/icons-material/VideoCallOutlined";
import KeyboardOutlinedIcon from "@mui/icons-material/KeyboardOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SaveAltOutlinedIcon from "@mui/icons-material/SaveAltOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";

export default function LandingPage() {
  const navigate = useNavigate();
  const { userData, handleLogout } = useContext(AuthContext);
  const isLoggedIn = Boolean(userData || localStorage.getItem("token"));
  const themeContext = useThemeMode();
  const isDark = Boolean(themeContext?.isDark);
  const tokens = themeContext?.tokens || {};
  const toggleTheme = themeContext?.toggleTheme;
  const c = tokens?.colors || {};

  const [meetingCode, setMeetingCode] = useState("");
  const [createdRoom, setCreatedRoom] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  const showToast = (message, severity = "info") => {
    setToast({ open: true, message, severity });
  };

  const handleStartInstant = () => {
    const randomCode = generateRoomCode();
    navigate(`/${randomCode}`);
  };

  const handleCreateShareLink = () => {
    const randomCode = generateRoomCode();
    setCreatedRoom(randomCode);
    setInviteModalOpen(true);
  };

  const handleJoinCall = (e) => {
    if (e) e.preventDefault();
    const clean = meetingCode.trim().replace(/https?:\/\/[^/]+\//, "");
    if (!clean) {
      showToast("Please enter a meeting code or paste an invite link", "warning");
      return;
    }
    navigate(`/${clean}`);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/${createdRoom}`;
    navigator.clipboard.writeText(link);
    showToast("Meeting link copied to clipboard", "success");
  };

  const shareWhatsApp = () => {
    const link = `${window.location.origin}/${createdRoom}`;
    const text = encodeURIComponent(
      `Join my video meeting on LiveLink:\n${link}\n\nFast, encrypted peer-to-peer video calling.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: c.bg, color: c.textHeading }}>
      {/* 1. Header / Navbar */}
      <Box
        component="header"
        sx={{
          pt: { xs: "calc(12px + env(safe-area-inset-top, 0px))", sm: 2 },
          pb: 2,
          px: { xs: 2, md: 5 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${c.border}`,
          backgroundColor: isDark ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100
        }}
      >
        {/* Brand */}
        <Box
          onClick={() => navigate("/")}
          sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer", userSelect: "none" }}
        >
          <Box
            component="img"
            src="/video.svg"
            alt="LiveLink"
            sx={{ width: 34, height: 34 }}
          />
          <Typography
            variant="h5"
            sx={{
              fontFamily: tokens.typography.fonts.heading,
              fontWeight: 800,
              color: c.textHeading,
              letterSpacing: "-0.03em"
            }}
          >
            Live<Box component="span" sx={{ color: c.primary }}>Link</Box>
          </Typography>
        </Box>

        {/* Actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton
            tooltip={isDark ? "Switch to light mode" : "Switch to dark mode"}
            variant="default"
            size="normal"
            onClick={toggleTheme}
            ariaLabel="Toggle theme"
          >
            {isDark ? (
              <LightModeOutlinedIcon sx={{ color: tokens?.accent?.dotAmber || tokens?.colors?.accent?.dotAmber || "#f59e0b" }} />
            ) : (
              <DarkModeOutlinedIcon sx={{ color: c.textMuted }} />
            )}
          </IconButton>

          {isLoggedIn ? (
            <>
              <Button variant="primary" size="normal" onClick={() => navigate("/home")}>
                Dashboard
              </Button>
              <Button variant="ghost" size="normal" onClick={handleLogout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="normal"
                onClick={() => {
                  const guestCode = generateRoomCode();
                  navigate(`/${guestCode}`);
                }}
                sx={{ display: { xs: "none", sm: "inline-flex" } }}
              >
                Join as guest
              </Button>
              <Button variant="secondary" size="normal" onClick={() => navigate("/auth")}>
                Sign in
              </Button>
              <Button variant="primary" size="normal" onClick={() => navigate("/auth")}>
                Create account
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* 2. Hero Section: 55/45 Desktop Split, Single Column Mobile */}
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 }, flexGrow: 1 }}>
        <Grid container spacing={{ xs: 5, md: 6 }} alignItems="center">
          {/* Left Column: 55% */}
          <Grid item xs={12} md={7}>
            <Box sx={{ pr: { md: 3 } }}>
              <Badge variant="primary" dot sx={{ mb: 2 }}>
                Encrypted peer-to-peer mesh
              </Badge>

              {/* Single H1 per page: Max 12 words */}
              <Typography
                component="h1"
                sx={{
                  fontFamily: tokens.typography.fonts.heading,
                  fontWeight: tokens.typography.hero.weight,
                  fontSize: { xs: tokens.typography.hero.mobile, md: tokens.typography.hero.desktop },
                  lineHeight: tokens.typography.hero.lineHeight,
                  letterSpacing: tokens.typography.hero.letterSpacing,
                  color: c.textHeading,
                  mb: 2.5
                }}
              >
                Simple, secure video calls for everyone
              </Typography>

              {/* Paragraph: Max 65 characters per line (max-width 560px) */}
              <Typography
                sx={{
                  fontFamily: tokens.typography.fonts.body,
                  fontSize: tokens.typography.body.fontSize,
                  lineHeight: tokens.typography.body.lineHeight,
                  color: c.textMuted,
                  maxWidth: tokens.typography.body.maxWidth,
                  mb: 4
                }}
              >
                Connect directly with family, friends, or teammates. No software to install, no tracking, and no meeting duration limits.
              </Typography>

              {/* Hero Actions */}
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 3 }}>
                <Button
                  variant="primary"
                  size="large"
                  onClick={handleStartInstant}
                  leftIcon={<VideoCallOutlinedIcon />}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Start instant meeting
                </Button>

                {/* Quick Join Input */}
                <Box
                  component="form"
                  onSubmit={handleJoinCall}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexGrow: 1,
                    maxWidth: { sm: 360 }
                  }}
                >
                  <Box sx={{ flexGrow: 1, "& .MuiBox-root": { mb: 0 } }}>
                    <Input
                      value={meetingCode}
                      onChange={(e) => setMeetingCode(e.target.value)}
                      placeholder="Enter room code or link"
                      prefixIcon={<KeyboardOutlinedIcon sx={{ fontSize: "20px" }} />}
                      sx={{ minHeight: tokens.buttonHeights.large }}
                    />
                  </Box>
                  <Button
                    type="submit"
                    variant="secondary"
                    size="large"
                    disabled={!meetingCode.trim()}
                  >
                    Join
                  </Button>
                </Box>
              </Box>

              {/* Secondary Actions */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", mt: 1 }}>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={handleCreateShareLink}
                  leftIcon={<ShareOutlinedIcon />}
                >
                  Create invite link
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => navigate(`/test-${generateRoomCode().substring(0, 4)}`)}
                  leftIcon={<TuneOutlinedIcon />}
                >
                  Test camera and mic
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Right Column: 45% Mockup */}
          <Grid item xs={12} md={5}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                position: "relative"
              }}
            >
              <Box
                component="picture"
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  width: "100%"
                }}
              >
                <source srcSet="/mobile.webp" type="image/webp" />
                <Box
                  component="img"
                  src="/mobile.png"
                  alt="LiveLink video call interface preview"
                  loading="lazy"
                  decoding="async"
                  sx={{
                    maxWidth: "100%",
                    maxHeight: { xs: 320, sm: 420, md: 480 },
                    height: "auto",
                    objectFit: "contain",
                    borderRadius: tokens.radii.card,
                    filter: isDark ? "drop-shadow(0 20px 30px rgba(0, 0, 0, 0.5))" : "drop-shadow(0 20px 30px rgba(0, 0, 0, 0.08))"
                  }}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* 3. Trust Strip */}
        <Box
          sx={{
            mt: { xs: 6, md: 8 },
            py: 2.5,
            px: 3,
            borderRadius: tokens.radii.card,
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : c.primarySoftBg,
            border: `1px solid ${isDark ? c.border : c.primarySoftBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            flexWrap: "wrap",
            gap: 2
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 18, color: c.success }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: c.textHeading }}>
              Encrypted peer-to-peer
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 18, color: c.success }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: c.textHeading }}>
              No account needed for guests
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 18, color: c.success }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: c.textHeading }}>
              Up to 4 participants
            </Typography>
          </Box>
        </Box>

        {/* 4. Three Feature Cards: Hover lift, 20px radius */}
        <Box sx={{ mt: { xs: 8, md: 12 } }}>
          <Box sx={{ textAlign: "center", mb: 5 }}>
            <Typography
              variant="h3"
              sx={{
                fontFamily: tokens.typography.fonts.heading,
                fontWeight: tokens.typography.sectionTitle.weight,
                fontSize: { xs: tokens.typography.sectionTitle.mobile, md: tokens.typography.sectionTitle.desktop },
                color: c.textHeading,
                mb: 1
              }}
            >
              Built for simple, reliable conversations
            </Typography>
            <Typography
              sx={{
                fontFamily: tokens.typography.fonts.body,
                color: c.textMuted,
                maxWidth: tokens.typography.body.maxWidth,
                mx: "auto"
              }}
            >
              High quality communication without third-party tracking or server-side recording.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Card 1 */}
            <Grid item xs={12} md={4}>
              <Card hoverLift padding={3.5} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: tokens.radii.button,
                    backgroundColor: c.primarySoftBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: c.primary,
                    mb: 2.5
                  }}
                >
                  <MicNoneOutlinedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: tokens.typography.fonts.heading,
                    fontWeight: tokens.typography.cardTitle.weight,
                    fontSize: tokens.typography.cardTitle.fontSize,
                    color: c.textHeading,
                    mb: 1
                  }}
                >
                  Crystal clear audio
                </Typography>
                <Typography variant="body2" sx={{ color: c.textMuted, lineHeight: 1.6, flexGrow: 1 }}>
                  Hardware-accelerated echo cancellation, noise suppression, and automatic gain control deliver natural sounding speech.
                </Typography>
              </Card>
            </Grid>

            {/* Card 2 */}
            <Grid item xs={12} md={4}>
              <Card hoverLift padding={3.5} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: tokens.radii.button,
                    backgroundColor: c.successSoftBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: c.success,
                    mb: 2.5
                  }}
                >
                  <LockOutlinedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: tokens.typography.fonts.heading,
                    fontWeight: tokens.typography.cardTitle.weight,
                    fontSize: tokens.typography.cardTitle.fontSize,
                    color: c.textHeading,
                    mb: 1
                  }}
                >
                  Fast peer-to-peer
                </Typography>
                <Typography variant="body2" sx={{ color: c.textMuted, lineHeight: 1.6, flexGrow: 1 }}>
                  Audio and video route directly between devices using WebRTC encryption and adaptive bitrate for minimal latency.
                </Typography>
              </Card>
            </Grid>

            {/* Card 3 */}
            <Grid item xs={12} md={4}>
              <Card hoverLift padding={3.5} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: tokens.radii.button,
                    backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: tokens?.accent?.dotAmber || tokens?.colors?.accent?.dotAmber || "#f59e0b",
                    mb: 2.5
                  }}
                >
                  <SaveAltOutlinedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontFamily: tokens.typography.fonts.heading,
                    fontWeight: tokens.typography.cardTitle.weight,
                    fontSize: tokens.typography.cardTitle.fontSize,
                    color: c.textHeading,
                    mb: 1
                  }}
                >
                  Private and local
                </Typography>
                <Typography variant="body2" sx={{ color: c.textMuted, lineHeight: 1.6, flexGrow: 1 }}>
                  Recordings are saved directly to your device storage as WebM files. We never store or inspect your video data.
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* 5. FAQ Accordion Section */}
        <Box sx={{ mt: { xs: 8, md: 12 }, pt: 6, borderTop: `1px solid ${c.border}` }}>
          <Box sx={{ textAlign: "center", mb: 5 }}>
            <Typography
              variant="h3"
              sx={{
                fontFamily: tokens.typography.fonts.heading,
                fontWeight: tokens.typography.sectionTitle.weight,
                fontSize: { xs: tokens.typography.sectionTitle.mobile, md: tokens.typography.sectionTitle.desktop },
                color: c.textHeading,
                mb: 1
              }}
            >
              Frequently asked questions
            </Typography>
            <Typography sx={{ color: c.textMuted, maxWidth: tokens.typography.body.maxWidth, mx: "auto" }}>
              Quick answers about privacy, mesh capacity, and features.
            </Typography>
          </Box>

          <Box sx={{ maxWidth: 760, mx: "auto" }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon sx={{ color: c.textMuted }} />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: c.textHeading }}>
                  Is LiveLink completely free to use?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ color: c.textMuted, lineHeight: 1.65 }}>
                  Yes, LiveLink is free to use with no hidden subscription fees, arbitrary time cutoffs, or credit card requirements.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon sx={{ color: c.textMuted }} />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: c.textHeading }}>
                  How many participants can join a meeting?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ color: c.textMuted, lineHeight: 1.65 }}>
                  Rooms are capped at 4 participants to provide optimal peer-to-peer performance, ultra-low latency, and smooth video without an intermediate relay server.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon sx={{ color: c.textMuted }} />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: c.textHeading }}>
                  Do attendees need an account or app download to join?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ color: c.textMuted, lineHeight: 1.65 }}>
                  No. Anyone with a meeting link can join directly from modern browsers on mobile or desktop without creating an account or installing extensions.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon sx={{ color: c.textMuted }} />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: c.textHeading }}>
                  How secure and private is my video call?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ color: c.textMuted, lineHeight: 1.65 }}>
                  All media streams route directly between participant devices using standard WebRTC DTLS and SRTP encryption. Video and audio never pass through an unencrypted relay.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon sx={{ color: c.textMuted }} />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: c.textHeading }}>
                  How does meeting recording work?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ color: c.textMuted, lineHeight: 1.65 }}>
                  When the host begins recording, the video and mixed audio are captured locally in the browser and downloaded directly to your device storage. Nothing is stored on our servers.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Box>
        </Box>
      </Container>

      {/* 6. Footer */}
      <Box
        component="footer"
        sx={{
          py: 3.5,
          px: { xs: 3, md: 5 },
          borderTop: `1px solid ${c.border}`,
          backgroundColor: c.surface,
          textAlign: "center"
        }}
      >
        <Typography variant="caption" sx={{ color: c.textMuted }}>
          © {new Date().getFullYear()} LiveLink. Encrypted peer-to-peer video calling.
        </Typography>
      </Box>

      {/* 7. Invite Modal */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Here's your meeting link"
        description="Share this link with people you want to join your call:"
        actions={
          <>
            <Button variant="ghost" size="normal" onClick={() => setInviteModalOpen(false)}>
              Close
            </Button>
            <Button variant="primary" size="normal" onClick={() => navigate(`/${createdRoom}`)}>
              Join meeting
            </Button>
          </>
        }
      >
        <Box
          sx={{
            p: 2,
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : c.primarySoftBg,
            border: `1px dashed ${c.border}`,
            borderRadius: tokens.radii.input,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            mb: 2.5
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: c.textHeading,
              wordBreak: "break-all",
              fontFamily: "monospace"
            }}
          >
            {window.location.origin}/{createdRoom}
          </Typography>
          <IconButton
            tooltip="Copy link"
            variant="ghost"
            size="small"
            onClick={copyLink}
          >
            <ContentCopyOutlinedIcon fontSize="small" sx={{ color: c.primary }} />
          </IconButton>
        </Box>

        <Button
          fullWidth
          variant="secondary"
          size="normal"
          onClick={shareWhatsApp}
          leftIcon={<ShareOutlinedIcon />}
        >
          Share via WhatsApp
        </Button>
      </Modal>

      {/* Toast Notification */}
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}
