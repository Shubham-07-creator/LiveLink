import React, { useContext, useState, useEffect, useCallback } from "react";
import withAuth from "../utils/withAuth";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { AuthContext } from "../contexts/AuthContext";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  InputAdornment,
  IconButton,
  Tooltip,
  Skeleton,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import GroupsIcon from "@mui/icons-material/Groups";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import TuneIcon from "@mui/icons-material/Tune";
import HistoryIcon from "@mui/icons-material/History";
import CloseIcon from "@mui/icons-material/Close";
import ReplayIcon from "@mui/icons-material/Replay";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import DeleteIcon from "@mui/icons-material/Delete";
import EventIcon from "@mui/icons-material/Event";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import { generateRoomCode } from "../utils/roomCode";

function HomeComponent() {
  const navigate = useNavigate();
  const { 
    addToUserHistory, 
    getHistoryOfUser, 
    userData,
    scheduleMeeting,
    getScheduledMeetings,
    deleteScheduledMeeting
  } = useContext(AuthContext);

  const [meetingCode, setMeetingCode] = useState("");
  const [createdRoom, setCreatedRoom] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Recent meetings state
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Scheduled meetings state
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [schedTitle, setSchedTitle] = useState("");
  const [schedDateTime, setSchedDateTime] = useState("");
  const [schedDuration, setSchedDuration] = useState(30);
  const [schedDescription, setSchedDescription] = useState("");
  const [schedLoading, setSchedLoading] = useState(false);

  const getNextHourString = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0, 0, 0);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fetchRecent = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const historyData = await getHistoryOfUser();
      if (Array.isArray(historyData)) {
        // Sort descending and take latest 4
        const sorted = [...historyData].reverse().slice(0, 5);
        setRecentMeetings(sorted);
      }
    } catch (e) {
      console.warn("Could not fetch user history:", e);
    } finally {
      setLoadingHistory(false);
    }
  }, [getHistoryOfUser]);

  const fetchScheduled = useCallback(async () => {
    if (!getScheduledMeetings) return;
    setLoadingScheduled(true);
    try {
      const data = await getScheduledMeetings();
      if (Array.isArray(data)) {
        setScheduledMeetings(data);
      }
    } catch (e) {
      console.warn("Could not fetch scheduled meetings:", e);
    } finally {
      setLoadingScheduled(false);
    }
  }, [getScheduledMeetings]);

  useEffect(() => {
    fetchRecent();
    fetchScheduled();
  }, [fetchRecent, fetchScheduled]);

  const handleOpenSchedule = () => {
    setSchedTitle("");
    setSchedDateTime(getNextHourString());
    setSchedDuration(30);
    setSchedDescription("");
    setScheduleModalOpen(true);
  };

  const handleCreateScheduledMeeting = async (e) => {
    if (e) e.preventDefault();
    if (!schedTitle.trim()) {
      setToastMsg("Please enter a meeting title");
      setToastOpen(true);
      return;
    }
    if (!schedDateTime) {
      setToastMsg("Please select a date and time");
      setToastOpen(true);
      return;
    }

    setSchedLoading(true);
    try {
      const code = generateRoomCode();
      await scheduleMeeting({
        title: schedTitle.trim(),
        startTime: new Date(schedDateTime).toISOString(),
        durationMinutes: Number(schedDuration) || 30,
        description: schedDescription.trim(),
        meetingCode: code
      });
      setScheduleModalOpen(false);
      setToastMsg("Meeting scheduled successfully!");
      setToastOpen(true);
      fetchScheduled();
    } catch (err) {
      setToastMsg(err.response?.data?.message || "Could not schedule meeting");
      setToastOpen(true);
    } finally {
      setSchedLoading(false);
    }
  };

  const handleDeleteScheduled = async (id) => {
    try {
      await deleteScheduledMeeting(id);
      setToastMsg("Scheduled meeting removed");
      setToastOpen(true);
      setScheduledMeetings((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      setToastMsg(err.response?.data?.message || "Could not delete meeting");
      setToastOpen(true);
    }
  };

  const getGoogleCalendarUrl = (meeting) => {
    const start = new Date(meeting.startTime);
    const durationMs = (meeting.durationMinutes || 30) * 60 * 1000;
    const end = new Date(start.getTime() + durationMs);

    const formatGDate = (d) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const dates = `${formatGDate(start)}/${formatGDate(end)}`;
    const link = `${window.location.origin}/${meeting.meetingCode}`;
    const details = `Join LiveLink video meeting:\n${link}${meeting.description ? `\n\nNotes: ${meeting.description}` : ""}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meeting.title)}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(link)}`;
  };

  // Generate secure room code
  const generateCode = () => {
    return generateRoomCode();
  };

  // Join video call by code
  const handleJoinCall = async (codeToJoin) => {
    const code = codeToJoin || meetingCode.trim();
    if (!code) {
      setToastMsg("Please enter a meeting code or paste a room link");
      setToastOpen(true);
      return;
    }
    const cleanCode = code.replace(/https?:\/\/[^/]+\//, "").trim();
    try {
      await addToUserHistory(cleanCode);
    } catch (e) {
      console.warn("Could not save to history:", e);
    }
    navigate(`/${cleanCode}`);
  };

  // Create Instant Call
  const handleCreateInstant = () => {
    const code = generateCode();
    navigate(`/${code}`);
  };

  // Create Invite Link
  const handleCreateInvite = () => {
    const code = generateCode();
    setCreatedRoom(code);
    setInviteModalOpen(true);
  };

  // Launch Hardware Test Lobby
  const handleLaunchLobby = () => {
    const code = generateCode();
    navigate(`/${code}`);
  };

  // Copy Link
  const copyLink = (customLink) => {
    const link = customLink || `${window.location.origin}/${createdRoom}`;
    navigator.clipboard.writeText(link);
    setToastMsg("Meeting link copied to clipboard!");
    setToastOpen(true);
  };

  // Share via WhatsApp
  const shareWhatsApp = () => {
    const link = `${window.location.origin}/${createdRoom}`;
    const text = encodeURIComponent(
      `Hey! Join my secure LiveLink meeting here:\n${link}\n\nFast, private & free video calling.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  const displayName = userData?.name || userData?.username || "Friend";

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <Navbar />

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, flexGrow: 1 }}>
        {/* =========================================================================
            1. CLEAN WELCOME HEADER
            ========================================================================= */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: "text.primary",
              letterSpacing: "-0.5px",
              fontSize: { xs: "1.75rem", md: "2.2rem" }
            }}
          >
            Welcome, {displayName} 👋
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 0.5, fontSize: "1rem" }}>
            Start a new video call or enter a code to join an existing room.
          </Typography>
        </Box>

        {/* =========================================================================
            2. TWO CORE ACTION CARDS: START OR JOIN
            ========================================================================= */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {/* Card 1: Start a Meeting */}
          <Grid item xs={12} sm={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: "20px",
                border: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                boxShadow: (theme) => theme.palette.mode === "dark" ? "0 4px 20px rgba(0,0,0,0.3)" : "0 4px 20px rgba(0,0,0,0.02)"
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
                  mb: 2.5
                }}
              >
                <VideocamIcon sx={{ fontSize: 26 }} />
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", mb: 0.8 }}>
                Start a Meeting
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 3, flexGrow: 1, lineHeight: 1.5 }}>
                Launch an instant video call or generate a shareable link to invite friends or teammates.
              </Typography>

              <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  onClick={handleCreateInstant}
                  sx={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 700,
                    borderRadius: "10px",
                    textTransform: "none",
                    px: 2.5,
                    py: 1,
                    flexGrow: 1,
                    boxShadow: "none",
                    "&:hover": { backgroundColor: "#1d4ed8" }
                  }}
                >
                  Start Now
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleOpenSchedule}
                  startIcon={<CalendarMonthIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    borderColor: "divider",
                    color: "text.primary",
                    fontWeight: 600,
                    borderRadius: "10px",
                    textTransform: "none",
                    px: 2,
                    py: 1,
                    "&:hover": { borderColor: "#2563eb", color: "#2563eb" }
                  }}
                >
                  Schedule
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCreateInvite}
                  sx={{
                    borderColor: "divider",
                    color: "text.primary",
                    fontWeight: 600,
                    borderRadius: "10px",
                    textTransform: "none",
                    px: 1.8,
                    py: 1,
                    "&:hover": { borderColor: "#2563eb", color: "#2563eb" }
                  }}
                >
                  Get Link
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Card 2: Join a Meeting */}
          <Grid item xs={12} sm={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: "20px",
                border: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                boxShadow: (theme) => theme.palette.mode === "dark" ? "0 4px 20px rgba(0,0,0,0.3)" : "0 4px 20px rgba(0,0,0,0.02)"
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "12px",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#16a34a",
                  mb: 2.5
                }}
              >
                <GroupsIcon sx={{ fontSize: 26 }} />
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", mb: 0.8 }}>
                Join a Meeting
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 3, flexGrow: 1, lineHeight: 1.5 }}>
                Have a meeting link or code? Paste it below to jump straight into the conversation.
              </Typography>

              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter code or link..."
                  value={meetingCode}
                  onChange={(e) => setMeetingCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleJoinCall();
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <KeyboardIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: "10px", fontSize: "0.9rem" }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={() => handleJoinCall()}
                  disabled={!meetingCode.trim()}
                  sx={{
                    backgroundColor: (theme) => theme.palette.mode === "dark" ? "#1e293b" : "#0f172a",
                    color: "#ffffff",
                    fontWeight: 700,
                    borderRadius: "10px",
                    textTransform: "none",
                    px: 2.5,
                    boxShadow: "none",
                    "&:hover": { backgroundColor: "#2563eb" },
                    "&:disabled": { backgroundColor: "action.disabledBackground" }
                  }}
                >
                  Join
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Quick Hardware Diagnostic Link */}
        <Box
          sx={{
            p: 2,
            mb: 5,
            borderRadius: "14px",
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <TuneIcon sx={{ color: "#2563eb", fontSize: 22 }} />
            <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>
              Want to check your camera preview and mic before calling?
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={handleLaunchLobby}
            sx={{ color: "primary.main", fontWeight: 700, textTransform: "none" }}
          >
            Test Camera & Mic →
          </Button>
        </Box>

        {/* =========================================================================
            3. UPCOMING SCHEDULED MEETINGS
            ========================================================================= */}
        <Box sx={{ mb: 5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
              <CalendarMonthIcon sx={{ color: "#2563eb", fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>
                Scheduled Meetings
              </Typography>
              {scheduledMeetings.length > 0 && (
                <Chip 
                  label={scheduledMeetings.length} 
                  size="small" 
                  sx={{ backgroundColor: "rgba(37, 99, 235, 0.1)", color: "#2563eb", fontWeight: 700 }} 
                />
              )}
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={handleOpenSchedule}
              startIcon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderColor: "#cbd5e1",
                color: "#2563eb",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "8px",
                "&:hover": { borderColor: "#2563eb", backgroundColor: "rgba(37, 99, 235, 0.04)" }
              }}
            >
              + Schedule Meeting
            </Button>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "18px",
              border: 1,
              borderColor: "divider",
              bgcolor: "background.paper"
            }}
          >
            {loadingScheduled ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Skeleton variant="rounded" height={72} sx={{ borderRadius: "12px" }} />
                <Skeleton variant="rounded" height={72} sx={{ borderRadius: "12px" }} />
              </Box>
            ) : scheduledMeetings.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {scheduledMeetings.map((item) => {
                  const dateStr = item.startTime
                    ? new Date(item.startTime).toLocaleString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "Scheduled";
                  const gCalUrl = getGoogleCalendarUrl(item);

                  return (
                    <Box
                      key={item._id}
                      sx={{
                        display: "flex",
                        alignItems: { xs: "flex-start", sm: "center" },
                        justifyContent: "space-between",
                        flexDirection: { xs: "column", sm: "row" },
                        p: 2,
                        borderRadius: "12px",
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "background.default" : "#f8fafc",
                        border: 1,
                        borderColor: "divider",
                        gap: 2
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "10px",
                            backgroundColor: "rgba(37, 99, 235, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#2563eb",
                            flexShrink: 0
                          }}
                        >
                          <EventIcon sx={{ fontSize: 22 }} />
                        </Box>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 800, color: "text.primary" }}>
                            {item.title}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mt: 0.4 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary", fontSize: "0.82rem" }}>
                              <AccessTimeIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                              <span>{dateStr}</span>
                            </Box>
                            <Chip 
                              label={`${item.durationMinutes || 30} min`} 
                              size="small" 
                              sx={{ height: 20, fontSize: "0.72rem", backgroundColor: (theme) => theme.palette.mode === "dark" ? "#1e293b" : "#e2e8f0", color: "text.secondary", fontWeight: 600 }} 
                            />
                            <Chip 
                              label={item.meetingCode} 
                              size="small" 
                              sx={{ height: 20, fontSize: "0.72rem", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#16a34a", fontWeight: 700 }} 
                            />
                          </Box>
                          {item.description && (
                            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                              {item.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", alignSelf: { xs: "stretch", sm: "center" }, justifyContent: { xs: "flex-end", sm: "flex-start" } }}>
                        <Button
                          size="small"
                          component="a"
                          href={gCalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                          sx={{
                            color: (theme) => theme.palette.mode === "dark" ? "#60a5fa" : "#1d4ed8",
                            backgroundColor: "rgba(37, 99, 235, 0.08)",
                            textTransform: "none",
                            fontWeight: 700,
                            borderRadius: "8px",
                            fontSize: "0.8rem",
                            px: 1.5,
                            "&:hover": { backgroundColor: "rgba(37, 99, 235, 0.16)" }
                          }}
                        >
                          Add to Google Calendar
                        </Button>

                        <Tooltip title="Copy Link">
                          <IconButton
                            size="small"
                            onClick={() => copyLink(`${window.location.origin}/${item.meetingCode}`)}
                            sx={{ color: "text.secondary" }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>

                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleJoinCall(item.meetingCode)}
                          sx={{
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            fontWeight: 700,
                            textTransform: "none",
                            borderRadius: "8px",
                            fontSize: "0.82rem",
                            px: 2,
                            boxShadow: "none",
                            "&:hover": { backgroundColor: "#1d4ed8" }
                          }}
                        >
                          Join
                        </Button>

                        <Tooltip title="Delete Scheduled Meeting">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteScheduled(item._id)}
                            sx={{ color: "text.secondary", "&:hover": { color: "#dc2626" } }}
                          >
                            <DeleteIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", py: 3.5 }}>
                <CalendarMonthIcon sx={{ fontSize: 32, color: "text.secondary", mb: 1, opacity: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                  No upcoming scheduled meetings
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, mb: 2 }}>
                  Schedule calls with date, duration, and one-click Google Calendar sync.
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleOpenSchedule}
                  startIcon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    borderColor: "divider",
                    color: "primary.main",
                    fontWeight: 700,
                    textTransform: "none",
                    borderRadius: "8px"
                  }}
                >
                  Schedule a Meeting
                </Button>
              </Box>
            )}
          </Paper>
        </Box>

        {/* =========================================================================
            4. RECENT MEETINGS
            ========================================================================= */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", letterSpacing: "-0.3px" }}>
              Recent Meetings
            </Typography>
            <Button
              size="small"
              onClick={() => navigate("/history")}
              sx={{ color: "primary.main", fontWeight: 700, textTransform: "none" }}
            >
              View full history
            </Button>
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: "18px",
              border: 1,
              borderColor: "divider",
              bgcolor: "background.paper"
            }}
          >
            {loadingHistory ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Skeleton variant="rounded" height={60} sx={{ borderRadius: "12px" }} />
                <Skeleton variant="rounded" height={60} sx={{ borderRadius: "12px" }} />
                <Skeleton variant="rounded" height={60} sx={{ borderRadius: "12px" }} />
              </Box>
            ) : recentMeetings.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {recentMeetings.map((item, index) => {
                  const roomCode = item.meetingCode || item;
                  const dateStr = item.date
                    ? new Date(item.date).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "Recent";

                  return (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1.8,
                        borderRadius: "12px",
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "background.default" : "#f8fafc",
                        border: 1,
                        borderColor: "divider",
                        gap: 1.5
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <VideocamIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                            {roomCode}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {dateStr}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Tooltip title="Copy Link">
                          <IconButton
                            size="small"
                            onClick={() => copyLink(`${window.location.origin}/${roomCode}`)}
                            sx={{ color: "text.secondary" }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>

                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleJoinCall(roomCode)}
                          startIcon={<ReplayIcon sx={{ fontSize: 15 }} />}
                          sx={{
                            backgroundColor: "#2563eb",
                            fontWeight: 700,
                            textTransform: "none",
                            borderRadius: "8px",
                            fontSize: "0.82rem",
                            px: 2,
                            boxShadow: "none",
                            "&:hover": { backgroundColor: "#1d4ed8" }
                          }}
                        >
                          Rejoin
                        </Button>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <HistoryIcon sx={{ fontSize: 32, color: "#cbd5e1", mb: 1 }} />
                <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                  No recent meetings yet
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748b", display: "block", mt: 0.5 }}>
                  When you create or join meetings, they will show up here for easy rejoining.
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Container>

      {/* =========================================================================
          4. SIMPLE INVITE MODAL
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
            Meeting Link Created
          </Typography>
          <IconButton size="small" onClick={() => setInviteModalOpen(false)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" sx={{ color: "#64748b", mb: 2 }}>
            Share this link with anyone you want to invite:
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
            <Tooltip title="Copy Link">
              <IconButton onClick={() => copyLink()} size="small" sx={{ color: "#2563eb" }}>
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
          <Button
            onClick={() => setInviteModalOpen(false)}
            sx={{ color: "#64748b", textTransform: "none" }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => handleJoinCall(createdRoom)}
            sx={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontWeight: 700,
              borderRadius: "8px",
              textTransform: "none",
              px: 3,
              boxShadow: "none",
              "&:hover": { backgroundColor: "#1d4ed8" }
            }}
          >
            Join Meeting
          </Button>
        </DialogActions>
      </Dialog>

      {/* =========================================================================
          5. SCHEDULE MEETING DIALOG
          ========================================================================= */}
      <Dialog
        open={scheduleModalOpen}
        onClose={() => !schedLoading && setScheduleModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CalendarMonthIcon sx={{ color: "#2563eb" }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
              Schedule a Meeting
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setScheduleModalOpen(false)} disabled={schedLoading}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleCreateScheduledMeeting}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
            <TextField
              label="Meeting Title"
              placeholder="e.g. Weekly Standup, Project Sync"
              value={schedTitle}
              onChange={(e) => setSchedTitle(e.target.value)}
              required
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Date &amp; Time"
                  type="datetime-local"
                  value={schedDateTime}
                  onChange={(e) => setSchedDateTime(e.target.value)}
                  required
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel shrink>Duration</InputLabel>
                  <Select
                    value={schedDuration}
                    onChange={(e) => setSchedDuration(e.target.value)}
                    label="Duration"
                    sx={{ borderRadius: "10px" }}
                  >
                    <MenuItem value={15}>15 mins</MenuItem>
                    <MenuItem value={30}>30 mins</MenuItem>
                    <MenuItem value={45}>45 mins</MenuItem>
                    <MenuItem value={60}>1 hour</MenuItem>
                    <MenuItem value={90}>1.5 hours</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <TextField
              label="Description / Agenda (Optional)"
              placeholder="Add meeting agenda or notes for attendees..."
              value={schedDescription}
              onChange={(e) => setSchedDescription(e.target.value)}
              multiline
              rows={2}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
            />

            <Typography variant="caption" sx={{ color: "#64748b" }}>
              A secure, unique room code will be generated automatically. You can add it directly to Google Calendar after scheduling.
            </Typography>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
            <Button
              onClick={() => setScheduleModalOpen(false)}
              disabled={schedLoading}
              sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={schedLoading || !schedTitle.trim() || !schedDateTime}
              sx={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontWeight: 700,
                borderRadius: "10px",
                textTransform: "none",
                px: 3,
                boxShadow: "none",
                "&:hover": { backgroundColor: "#1d4ed8" }
              }}
            >
              {schedLoading ? "Scheduling..." : "Schedule Meeting"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Toast Notification */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={3500}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setToastOpen(false)} sx={{ borderRadius: "10px" }}>
          {toastMsg}
        </Alert>
      </Snackbar>

      <Footer />
    </Box>
  );
}

export default withAuth(HomeComponent);