import React, { useState, useContext } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  TextField,
  Paper,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from "@mui/material";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VideocamIcon from "@mui/icons-material/Videocam";
import SecurityIcon from "@mui/icons-material/Security";
import PresentToAllIcon from "@mui/icons-material/PresentToAll";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddLinkIcon from "@mui/icons-material/AddLink";
import ShareIcon from "@mui/icons-material/Share";
import ForumIcon from "@mui/icons-material/Forum";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useThemeMode } from "../contexts/ThemeContext";

import { generateRoomCode } from "../utils/roomCode";

export default function LandingPage() {
  const navigate = useNavigate();
  const { userData, handleLogout } = useContext(AuthContext);
  const isLoggedIn = Boolean(userData || localStorage.getItem("token"));

  const [meetingCode, setMeetingCode] = useState("");
  const [createdRoom, setCreatedRoom] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Start instant meeting
  const handleStartInstant = () => {
    const randomCode = generateRoomCode();
    navigate(`/${randomCode}`);
  };

  // Create link to share
  const handleCreateShareLink = () => {
    const randomCode = generateRoomCode();
    setCreatedRoom(randomCode);
    setInviteModalOpen(true);
  };

  // Join meeting with code or link
  const handleJoinCall = (e) => {
    if (e) e.preventDefault();
    const clean = meetingCode.trim().replace(/https?:\/\/[^/]+\//, "");
    if (!clean) {
      setToastMsg("Please enter a meeting code or paste an invite link");
      setToastOpen(true);
      return;
    }
    navigate(`/${clean}`);
  };

  // Copy created room link
  const copyLink = () => {
    const link = `${window.location.origin}/${createdRoom}`;
    navigator.clipboard.writeText(link);
    setToastMsg("Meeting link copied to clipboard!");
    setToastOpen(true);
  };

  // Share via WhatsApp
  const shareWhatsApp = () => {
    const link = `${window.location.origin}/${createdRoom}`;
    const text = encodeURIComponent(
      `Hey! Join my video meeting on LiveLink:\n${link}\n\nFast, private & free video calling.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const { mode, toggleTheme } = useThemeMode();

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "background.default", color: "text.primary" }}>
      {/* =========================================================================
          1. CLEAN MINIMALIST NAVBAR
          ========================================================================= */}
      <Box
        component="header"
        sx={{
          py: 2,
          px: { xs: 2.5, md: 5 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          backgroundColor: mode === "dark" ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100
        }}
      >
        {/* Brand Logo */}
        <Box
          onClick={() => navigate("/")}
          sx={{ display: "flex", alignItems: "center", gap: 1.2, cursor: "pointer", userSelect: "none" }}
        >
          <Box
            component="img"
            src="/video.svg"
            alt="LiveLink"
            sx={{ width: 36, height: 36 }}
          />
          <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary", letterSpacing: "-0.5px" }}>
            Live<span style={{ color: "#2563eb" }}>Link</span>
          </Typography>
        </Box>

        {/* Navigation Action Buttons */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
          {/* Light / Dark Mode Toggle */}
          <Tooltip title={mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            <IconButton
              onClick={toggleTheme}
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              sx={{
                color: "text.primary",
                borderRadius: "10px",
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#f8fafc",
                p: 0.9,
                "&:hover": { backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "#f1f5f9" }
              }}
            >
              {mode === "dark" ? <LightModeIcon sx={{ fontSize: 20, color: "#f59e0b" }} /> : <DarkModeIcon sx={{ fontSize: 20, color: "#64748b" }} />}
            </IconButton>
          </Tooltip>

          {isLoggedIn ? (
            <>
              <Button
                onClick={() => navigate("/home")}
                variant="contained"
                sx={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 700,
                  borderRadius: "10px",
                  textTransform: "none",
                  px: 2.5,
                  boxShadow: "none",
                  "&:hover": { backgroundColor: "#1d4ed8" }
                }}
              >
                Dashboard
              </Button>
              <Button
                onClick={handleLogout}
                variant="text"
                sx={{ color: "text.secondary", fontWeight: 600, textTransform: "none" }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  const guestCode = Math.random().toString(36).substring(2, 8);
                  navigate(`/${guestCode}`);
                }}
                variant="text"
                sx={{
                  color: "text.secondary",
                  fontWeight: 600,
                  textTransform: "none",
                  display: { xs: "none", sm: "inline-flex" },
                  "&:hover": { color: "#2563eb", backgroundColor: "rgba(37,99,235,0.06)" }
                }}
              >
                Join as Guest
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                variant="text"
                sx={{ color: "text.secondary", fontWeight: 600, textTransform: "none" }}
              >
                Register
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                variant="contained"
                sx={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontWeight: 700,
                  borderRadius: "10px",
                  textTransform: "none",
                  px: 2.5,
                  boxShadow: "none",
                  "&:hover": { backgroundColor: "#1d4ed8" }
                }}
              >
                Login
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* =========================================================================
          2. SIMPLE & BEAUTIFUL HERO SECTION (LIKE IMAGE 1)
          ========================================================================= */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 }, flexGrow: 1 }}>
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
          {/* Left Hero Text & Actions */}
          <Grid item xs={12} md={6}>
            <Box sx={{ pr: { md: 2 } }}>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 800,
                  color: "#0f172a",
                  fontSize: { xs: "2.4rem", sm: "3rem", md: "3.5rem" },
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  mb: 2.5
                }}
              >
                <span style={{ color: "#2563eb" }}>Connect</span> with your loved ones
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: "#64748b",
                  fontSize: { xs: "1.05rem", md: "1.2rem" },
                  lineHeight: 1.6,
                  mb: 4,
                  maxWidth: 480
                }}
              >
                Simple, reliable, and secure video calls. Meet with family, friends, or coworkers from any device without installing any apps.
              </Typography>

              {/* Action Area: Start or Join */}
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.8, mb: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleStartInstant}
                  startIcon={<VideoCallIcon sx={{ fontSize: 24 }} />}
                  sx={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "1rem",
                    borderRadius: "12px",
                    px: 3.5,
                    py: 1.4,
                    textTransform: "none",
                    boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
                    whiteSpace: "nowrap",
                    "&:hover": { backgroundColor: "#1d4ed8" }
                  }}
                >
                  New Meeting
                </Button>

                {/* Quick Join Input */}
                <Paper
                  component="form"
                  onSubmit={handleJoinCall}
                  elevation={0}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #cbd5e1",
                    borderRadius: "12px",
                    px: 1.5,
                    py: 0.5,
                    flexGrow: 1,
                    backgroundColor: "#ffffff",
                    "&:focus-within": { borderColor: "#2563eb", boxShadow: "0 0 0 2px rgba(37,99,235,0.15)" }
                  }}
                >
                  <TextField
                    variant="standard"
                    placeholder="Enter a code or link"
                    value={meetingCode}
                    onChange={(e) => setMeetingCode(e.target.value)}
                    InputProps={{
                      disableUnderline: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyboardIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                        </InputAdornment>
                      ),
                      sx: { fontSize: "0.95rem" }
                    }}
                    sx={{ flexGrow: 1, px: 0.5 }}
                  />
                  <Button
                    type="submit"
                    variant="text"
                    disabled={!meetingCode.trim()}
                    sx={{
                      color: "#2563eb",
                      fontWeight: 700,
                      textTransform: "none",
                      "&:disabled": { color: "#cbd5e1" }
                    }}
                  >
                    Join
                  </Button>
                </Paper>
              </Box>

              {/* Quick Secondary Links */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", color: "#64748b" }}>
                <Button
                  size="small"
                  onClick={handleCreateShareLink}
                  startIcon={<WhatsAppIcon sx={{ color: "#25D366" }} />}
                  sx={{ color: "#475569", textTransform: "none", fontWeight: 600, fontSize: "0.88rem" }}
                >
                  Create invite link
                </Button>
                <Button
                  size="small"
                  onClick={() => navigate(`/test-${Math.random().toString(36).substring(2, 7)}`)}
                  startIcon={<TuneIcon sx={{ color: "#2563eb" }} />}
                  sx={{ color: "#475569", textTransform: "none", fontWeight: 600, fontSize: "0.88rem" }}
                >
                  Test camera &amp; mic
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* Right Hero Video Call Mockup (Optimized WebP with lazy loading) */}
          <Grid item xs={12} md={6}>
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
                  alignItems: "center"
                }}
              >
                <source srcSet="/mobile.webp" type="image/webp" />
                <Box
                  component="img"
                  src="/mobile.png"
                  alt="LiveLink Video Call Interface"
                  loading="lazy"
                  decoding="async"
                  sx={{
                    maxWidth: "100%",
                    maxHeight: { xs: 340, sm: 460, md: 520 },
                    height: "auto",
                    objectFit: "contain",
                    filter: "drop-shadow(0 20px 40px rgba(0, 0, 0, 0.08))",
                    transition: "transform 0.3s ease",
                    "&:hover": { transform: "scale(1.02)" }
                  }}
                />
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* =========================================================================
            2. HOW IT WORKS: CREATE, SHARE, TALK
            ========================================================================= */}
        <Box sx={{ mt: { xs: 8, md: 12 }, pt: 6, borderTop: "1px solid", borderColor: "divider" }}>
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography
              variant="overline"
              sx={{
                color: "#2563eb",
                fontWeight: 800,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                display: "block",
                mb: 0.5
              }}
            >
              Simple 3-Step Flow
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "text.primary",
                letterSpacing: "-0.5px",
                mb: 1.2
              }}
            >
              How It Works
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 540, mx: "auto" }}>
              Start talking in three effortless steps. No account required for guests, and zero software installs.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Step 1: Create */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  borderRadius: "18px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transition: "all 0.2s ease",
                  "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 25px rgba(0,0,0,0.04)" }
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "12px",
                      backgroundColor: "rgba(37, 99, 235, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#2563eb"
                    }}
                  >
                    <AddLinkIcon sx={{ fontSize: 26 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 900, fontSize: "1.6rem", color: "divider", lineHeight: 1 }}>
                    01
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", mb: 1 }}>
                  Create
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                  Click "New Meeting" to generate a secure peer-to-peer room instantly, or schedule an upcoming meeting with a calendar invite.
                </Typography>
              </Paper>
            </Grid>

            {/* Step 2: Share */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  borderRadius: "18px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transition: "all 0.2s ease",
                  "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 25px rgba(0,0,0,0.04)" }
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "12px",
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#16a34a"
                    }}
                  >
                    <ShareIcon sx={{ fontSize: 26 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 900, fontSize: "1.6rem", color: "divider", lineHeight: 1 }}>
                    02
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", mb: 1 }}>
                  Share
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                  Copy your unique link or short room code. Send it to anyone via WhatsApp, email, or team chat with zero setup required.
                </Typography>
              </Paper>
            </Grid>

            {/* Step 3: Talk */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  borderRadius: "18px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transition: "all 0.2s ease",
                  "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 25px rgba(0,0,0,0.04)" }
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "12px",
                      backgroundColor: "rgba(99, 102, 241, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6366f1"
                    }}
                  >
                    <ForumIcon sx={{ fontSize: 26 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 900, fontSize: "1.6rem", color: "divider", lineHeight: 1 }}>
                    03
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", mb: 1 }}>
                  Talk
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                  Connect instantly with encrypted peer-to-peer audio, HD video, live screen sharing, in-call chat, and real-time captions.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* =========================================================================
            3. THREE SIMPLE & BALANCED FEATURE CARDS (NO CLUTTER)
            ========================================================================= */}
        <Box sx={{ mt: { xs: 8, md: 12 }, pt: 6, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: "text.primary",
              textAlign: "center",
              letterSpacing: "-0.3px",
              mb: 1
            }}
          >
            Built for simple, crystal-clear conversations
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", textAlign: "center", mb: 5, maxWidth: 520, mx: "auto" }}
          >
            Everything you need for personal catchups or professional teamwork without any unnecessary hassle.
          </Typography>

          <Grid container spacing={3}>
            {/* Card 1 */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  borderRadius: "18px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.2s ease",
                  "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    backgroundColor: "rgba(37, 99, 235, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2563eb",
                    mb: 2
                  }}
                >
                  <VideocamIcon sx={{ fontSize: 26 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", mb: 1, fontSize: "1.1rem" }}>
                  Instant Video Meetings
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, flexGrow: 1 }}>
                  Start 1-to-1 or group video calls instantly with anyone, on any browser or mobile device. Zero setup or downloads.
                </Typography>
              </Paper>
            </Grid>

            {/* Card 2 */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  borderRadius: "18px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.2s ease",
                  "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    backgroundColor: "rgba(22, 163, 74, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#16a34a",
                    mb: 2
                  }}
                >
                  <SecurityIcon sx={{ fontSize: 26 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", mb: 1, fontSize: "1.1rem" }}>
                  Encrypted Peer-to-Peer
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, flexGrow: 1 }}>
                  Your video and audio streams route directly between participants using WebSockets and WebRTC encryption. No middleman recording.
                </Typography>
              </Paper>
            </Grid>

            {/* Card 3 */}
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 3.5,
                  borderRadius: "18px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.2s ease",
                  "&:hover": { transform: "translateY(-3px)", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    backgroundColor: "rgba(99, 102, 241, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6366f1",
                    mb: 2
                  }}
                >
                  <PresentToAllIcon sx={{ fontSize: 26 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", mb: 1, fontSize: "1.1rem" }}>
                  Record to Your Device
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, flexGrow: 1 }}>
                  Capture meeting highlights and screen shares directly to your device storage in high quality, without server storage limits.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* =========================================================================
            4. FREQUENTLY ASKED QUESTIONS (FAQ)
            ========================================================================= */}
        <Box sx={{ mt: { xs: 8, md: 12 }, pt: 6, borderTop: "1px solid", borderColor: "divider" }}>
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography
              variant="overline"
              sx={{
                color: "#2563eb",
                fontWeight: 800,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                display: "block",
                mb: 0.5
              }}
            >
              Have Questions?
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "text.primary",
                letterSpacing: "-0.5px",
                mb: 1.2
              }}
            >
              Frequently Asked Questions
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 540, mx: "auto" }}>
              Everything you need to know about LiveLink's privacy, group capacity, and features.
            </Typography>
          </Box>

          <Box sx={{ maxWidth: 800, mx: "auto" }}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "text.secondary" }} />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
                  Is LiveLink completely free to use?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.65 }}>
                  Yes, LiveLink is 100% free with no hidden charges, paywalls, or arbitrary call duration caps. You can create as many meetings as you need.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "text.secondary" }} />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
                  How many participants can join a meeting?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.65 }}>
                  LiveLink supports up to 6 participants per room. By focusing on a 6-member peer-to-peer mesh architecture, we ensure ultra-low latency, crisp audio, and high quality video without central relay delays.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "text.secondary" }} />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
                  Do attendees need an account or app download to join?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.65 }}>
                  No. Anyone with your meeting link can join as a guest instantly from Chrome, Firefox, Safari, or Edge on mobile and desktop. No installation or registration is required.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "text.secondary" }} />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
                  How secure and private is my video call?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.65 }}>
                  LiveLink streams peer-to-peer using WebRTC with industry-standard DTLS/SRTP encryption. Your media flows directly between attendees' devices and is never recorded or stored on our servers.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "text.secondary" }} />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
                  How does meeting recording work?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.65 }}>
                  When you press Record, the meeting stream is captured in your browser and saved directly to your device storage as a WebM video file. Your recording stays entirely in your hands.
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "text.secondary" }} />}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
                  Can I schedule meetings in advance with Google Calendar?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.65 }}>
                  Yes! From your dashboard, click "Schedule Meeting" to set a title, date, and duration. With one click, you can add it directly to Google Calendar with the room link pre-filled.
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Box>
        </Box>
      </Container>

      {/* =========================================================================
          5. CLEAN MINIMALIST FOOTER
          ========================================================================= */}
      <Box
        component="footer"
        sx={{
          py: 4,
          px: { xs: 3, md: 5 },
          borderTop: "1px solid",
          borderColor: "divider",
          backgroundColor: mode === "dark" ? "rgba(17, 24, 39, 0.95)" : "#ffffff",
          textAlign: "center"
        }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.88rem" }}>
          © {new Date().getFullYear()} LiveLink. Distance means nothing with LiveLink. Encrypted peer-to-peer video calling.
        </Typography>
      </Box>

      {/* =========================================================================
          5. SHARE LINK MODAL
          ========================================================================= */}
      <Dialog
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "18px", p: 1 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Here's your meeting link
          </Typography>
          <IconButton size="small" onClick={() => setInviteModalOpen(false)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Copy this link and send it to people you want to meet with:
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              backgroundColor: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2.5
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a", wordBreak: "break-all" }}>
              {window.location.origin}/{createdRoom}
            </Typography>
            <Tooltip title="Copy link">
              <IconButton size="small" onClick={copyLink} sx={{ color: "#2563eb" }}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>

          <Button
            fullWidth
            variant="outlined"
            onClick={shareWhatsApp}
            startIcon={<WhatsAppIcon sx={{ color: "#25D366" }} />}
            sx={{
              py: 1,
              borderColor: "#25D366",
              color: "#0f172a",
              fontWeight: 600,
              borderRadius: "10px",
              textTransform: "none",
              mb: 1,
              "&:hover": { backgroundColor: "rgba(37, 211, 102, 0.08)", borderColor: "#25D366" }
            }}
          >
            Share via WhatsApp
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInviteModalOpen(false)} sx={{ color: "#64748b", textTransform: "none" }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate(`/${createdRoom}`)}
            sx={{
              backgroundColor: "#2563eb",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "8px",
              px: 3,
              "&:hover": { backgroundColor: "#1d4ed8" }
            }}
          >
            Join Meeting
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast Alert */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" sx={{ borderRadius: "10px", fontWeight: 600 }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}