import React, { useContext, useState, useEffect, useCallback } from "react";
import withAuth from "../utils/withAuth";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { AuthContext } from "../contexts/AuthContext";
import { useThemeMode } from "../contexts/ThemeContext";
import { generateRoomCode } from "../utils/roomCode";
import {
  Button,
  IconButton,
  Card,
  Input,
  Badge,
  Chip,
  Modal,
  Toast,
  Skeleton,
  EmptyState
} from "../components/ui";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

import VideoCallOutlinedIcon from "@mui/icons-material/VideoCallOutlined";
import KeyboardOutlinedIcon from "@mui/icons-material/KeyboardOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ScreenShareOutlinedIcon from "@mui/icons-material/ScreenShareOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import ReplayOutlinedIcon from "@mui/icons-material/ReplayOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";

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

  const { isDark, tokens } = useThemeMode();
  const c = tokens.colors;

  const [meetingCode, setMeetingCode] = useState("");
  const [createdRoom, setCreatedRoom] = useState(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

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

  const showToast = (message, severity = "info") => {
    setToast({ open: true, message, severity });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const todayFormatted = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());

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
      showToast("Please enter a meeting title", "warning");
      return;
    }
    if (!schedDateTime) {
      showToast("Please select a date and time", "warning");
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
      showToast("Meeting scheduled successfully", "success");
      fetchScheduled();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not schedule meeting", "error");
    } finally {
      setSchedLoading(false);
    }
  };

  const handleDeleteScheduled = async (id) => {
    try {
      await deleteScheduledMeeting(id);
      showToast("Scheduled meeting removed", "success");
      setScheduledMeetings((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      showToast(err.response?.data?.message || "Could not delete meeting", "error");
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

  const handleJoinCall = async (codeToJoin) => {
    const code = codeToJoin || meetingCode.trim();
    if (!code) {
      showToast("Please enter a meeting code or paste a room link", "warning");
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

  const handleCreateInstant = () => {
    const code = generateRoomCode();
    navigate(`/${code}`);
  };

  const handleCreateInvite = () => {
    const code = generateRoomCode();
    setCreatedRoom(code);
    setInviteModalOpen(true);
  };

  const handleShareScreenCall = () => {
    const code = generateRoomCode();
    navigate(`/${code}?screen=true`);
  };

  const copyLink = (customLink) => {
    const link = customLink || `${window.location.origin}/${createdRoom}`;
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

  const firstName = userData?.name ? userData.name.split(" ")[0] : "Friend";

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: c.bg, color: c.textHeading }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, flexGrow: 1 }}>
        {/* 1. Welcome Header (Single H1) */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography
                component="h1"
                sx={{
                  fontFamily: tokens.typography.fonts.heading,
                  fontWeight: tokens.typography.pageTitle.weight,
                  fontSize: { xs: tokens.typography.pageTitle.mobile, md: tokens.typography.pageTitle.desktop },
                  color: c.textHeading,
                  letterSpacing: "-0.02em"
                }}
              >
                {getGreeting()}, {firstName}
              </Typography>
              <Typography variant="body2" sx={{ color: c.textMuted, mt: 0.5 }}>
                {todayFormatted}
              </Typography>
            </Box>

            {/* Profile Pill */}
            <Box
              onClick={() => navigate("/profile")}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1.5,
                p: "6px 14px 6px 8px",
                borderRadius: tokens.radii.badge,
                backgroundColor: c.surface,
                border: `1px solid ${c.border}`,
                cursor: "pointer",
                transition: `all ${tokens.motion.micro}`,
                "&:hover": {
                  borderColor: c.primary,
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#f8fafc"
                }
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: c.primarySoftBg,
                  color: c.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "14px"
                }}
              >
                {firstName.charAt(0).toUpperCase()}
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: c.textHeading, lineHeight: 1.2 }}>
                  {userData?.name || "Account"}
                </Typography>
                <Typography variant="caption" sx={{ color: c.textMuted, fontSize: "11px", display: "block" }}>
                  {userData?.email || "Signed in"}
                </Typography>
              </Box>
              {userData?.isEmailVerified && (
                <Badge variant="success" sx={{ fontSize: "11px", py: "1px", px: "6px" }}>
                  Verified
                </Badge>
              )}
            </Box>
          </Box>
        </Box>

        {/* 2. Four Quick Action Cards */}
        <Grid container spacing={2.5} sx={{ mb: 5 }}>
          {/* Action 1: New meeting (Primary Filled Blue) */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              hoverLift
              onClick={handleCreateInstant}
              padding={2.5}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                backgroundColor: c.primary,
                borderColor: "transparent",
                color: "#ffffff"
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: tokens.radii.button,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  mb: 2
                }}
              >
                <VideoCallOutlinedIcon sx={{ fontSize: 24 }} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontFamily: tokens.typography.fonts.heading,
                  fontWeight: tokens.typography.cardTitle.weight,
                  fontSize: tokens.typography.cardTitle.fontSize,
                  color: "#ffffff",
                  mb: 0.5
                }}
              >
                New meeting
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "13px" }}>
                Start an instant video room
              </Typography>
            </Card>
          </Grid>

          {/* Action 2: Join with code */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              hoverLift
              onClick={() => setJoinModalOpen(true)}
              padding={2.5}
              sx={{ height: "100%", display: "flex", flexDirection: "column", cursor: "pointer" }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: tokens.radii.button,
                  backgroundColor: c.primarySoftBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: c.primary,
                  mb: 2
                }}
              >
                <KeyboardOutlinedIcon sx={{ fontSize: 24 }} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontFamily: tokens.typography.fonts.heading,
                  fontWeight: tokens.typography.cardTitle.weight,
                  fontSize: tokens.typography.cardTitle.fontSize,
                  color: c.textHeading,
                  mb: 0.5
                }}
              >
                Join with code
              </Typography>
              <Typography variant="body2" sx={{ color: c.textMuted, fontSize: "13px" }}>
                Enter code or paste invite link
              </Typography>
            </Card>
          </Grid>

          {/* Action 3: Schedule */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              hoverLift
              onClick={handleOpenSchedule}
              padding={2.5}
              sx={{ height: "100%", display: "flex", flexDirection: "column", cursor: "pointer" }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: tokens.radii.button,
                  backgroundColor: c.successSoftBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: c.success,
                  mb: 2
                }}
              >
                <CalendarMonthOutlinedIcon sx={{ fontSize: 24 }} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontFamily: tokens.typography.fonts.heading,
                  fontWeight: tokens.typography.cardTitle.weight,
                  fontSize: tokens.typography.cardTitle.fontSize,
                  color: c.textHeading,
                  mb: 0.5
                }}
              >
                Schedule
              </Typography>
              <Typography variant="body2" sx={{ color: c.textMuted, fontSize: "13px" }}>
                Plan ahead & sync calendar
              </Typography>
            </Card>
          </Grid>

          {/* Action 4: Share screen */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              hoverLift
              onClick={handleShareScreenCall}
              padding={2.5}
              sx={{ height: "100%", display: "flex", flexDirection: "column", cursor: "pointer" }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: tokens.radii.button,
                  backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: tokens.accent.dotAmber,
                  mb: 2
                }}
              >
                <ScreenShareOutlinedIcon sx={{ fontSize: 24 }} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontFamily: tokens.typography.fonts.heading,
                  fontWeight: tokens.typography.cardTitle.weight,
                  fontSize: tokens.typography.cardTitle.fontSize,
                  color: c.textHeading,
                  mb: 0.5
                }}
              >
                Share screen
              </Typography>
              <Typography variant="body2" sx={{ color: c.textMuted, fontSize: "13px" }}>
                Start call with presentation
              </Typography>
            </Card>
          </Grid>
        </Grid>

        {/* Diagnostic Bar */}
        <Box
          sx={{
            p: 2,
            mb: 5,
            borderRadius: tokens.radii.card,
            bgcolor: c.surface,
            border: `1px solid ${c.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <TuneOutlinedIcon sx={{ color: c.primary, fontSize: 22 }} />
            <Typography variant="body2" sx={{ color: c.textHeading, fontWeight: 600 }}>
              Want to check camera preview and mic before calling?
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant="ghost"
              size="small"
              onClick={handleCreateInvite}
            >
              Create invite link
            </Button>
            <Button
              variant="ghost"
              size="small"
              onClick={() => {
                const code = generateRoomCode();
                navigate(`/${code}`);
              }}
            >
              Test camera and mic →
            </Button>
          </Box>
        </Box>

        {/* 3. Bento Grid: Two Columns (Upcoming Meetings & Recent Meetings) */}
        <Grid container spacing={3}>
          {/* Left Column: Upcoming Meetings */}
          <Grid item xs={12} md={7}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontFamily: tokens.typography.fonts.heading,
                    fontWeight: tokens.typography.sectionTitle.weight,
                    fontSize: "20px",
                    color: c.textHeading
                  }}
                >
                  Upcoming meetings
                </Typography>
                {scheduledMeetings.length > 0 && (
                  <Badge variant="primary">
                    {scheduledMeetings.length}
                  </Badge>
                )}
              </Box>
              <Button
                variant="secondary"
                size="small"
                onClick={handleOpenSchedule}
                leftIcon={<CalendarMonthOutlinedIcon />}
              >
                Schedule
              </Button>
            </Box>

            <Card padding={2.5}>
              {loadingScheduled ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Skeleton variant="card" height={80} />
                  <Skeleton variant="card" height={80} />
                </Box>
              ) : scheduledMeetings.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                          p: 2,
                          borderRadius: tokens.radii.button,
                          bgcolor: isDark ? "rgba(255, 255, 255, 0.03)" : c.primarySoftBg,
                          border: `1px solid ${c.border}`,
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          alignItems: { xs: "flex-start", sm: "center" },
                          justifyContent: "space-between",
                          gap: 2
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: tokens.radii.button,
                              backgroundColor: c.primarySoftBg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: c.primary,
                              flexShrink: 0
                            }}
                          >
                            <EventOutlinedIcon sx={{ fontSize: 22 }} />
                          </Box>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600, color: c.textHeading }}>
                              {item.title}
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: c.textMuted, fontSize: "13px" }}>
                                <AccessTimeOutlinedIcon sx={{ fontSize: 14 }} />
                                <span>{dateStr}</span>
                              </Box>
                              <Chip label={`${item.durationMinutes || 30} min`} />
                              <Badge variant="neutral">
                                {item.meetingCode}
                              </Badge>
                            </Box>
                            {item.description && (
                              <Typography variant="caption" sx={{ color: c.textMuted, display: "block", mt: 0.5 }}>
                                {item.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, alignSelf: { xs: "stretch", sm: "center" }, justifyContent: { xs: "flex-end", sm: "flex-start" } }}>
                          <IconButton
                            tooltip="Add to Google Calendar"
                            variant="ghost"
                            size="small"
                            onClick={() => window.open(gCalUrl, "_blank", "noopener,noreferrer")}
                          >
                            <OpenInNewOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                          <IconButton
                            tooltip="Copy link"
                            variant="ghost"
                            size="small"
                            onClick={() => copyLink(`${window.location.origin}/${item.meetingCode}`)}
                          >
                            <ContentCopyOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => handleJoinCall(item.meetingCode)}
                          >
                            Join
                          </Button>
                          <IconButton
                            tooltip="Delete meeting"
                            variant="danger"
                            size="small"
                            onClick={() => handleDeleteScheduled(item._id)}
                          >
                            <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <EmptyState
                  icon={<CalendarMonthOutlinedIcon />}
                  title="No upcoming meetings scheduled"
                  description="Schedule meetings in advance with dates, durations, and calendar sync."
                  action={
                    <Button variant="secondary" size="small" onClick={handleOpenSchedule}>
                      Schedule one
                    </Button>
                  }
                />
              )}
            </Card>
          </Grid>

          {/* Right Column: Recent Meetings */}
          <Grid item xs={12} md={5}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography
                variant="h3"
                sx={{
                  fontFamily: tokens.typography.fonts.heading,
                  fontWeight: tokens.typography.sectionTitle.weight,
                  fontSize: "20px",
                  color: c.textHeading
                }}
              >
                Recent meetings
              </Typography>
              <Button
                variant="ghost"
                size="small"
                onClick={() => navigate("/history")}
              >
                View full history
              </Button>
            </Box>

            <Card padding={2.5}>
              {loadingHistory ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Skeleton variant="card" height={60} />
                  <Skeleton variant="card" height={60} />
                  <Skeleton variant="card" height={60} />
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
                          p: 1.5,
                          borderRadius: tokens.radii.button,
                          bgcolor: isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
                          border: `1px solid ${c.border}`,
                          gap: 1.5
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <VideoCallOutlinedIcon sx={{ color: c.primary, fontSize: 20 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: c.textHeading }}>
                              {roomCode}
                            </Typography>
                            <Typography variant="caption" sx={{ color: c.textMuted }}>
                              {dateStr}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <IconButton
                            tooltip="Copy link"
                            variant="ghost"
                            size="small"
                            onClick={() => copyLink(`${window.location.origin}/${roomCode}`)}
                          >
                            <ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => handleJoinCall(roomCode)}
                            leftIcon={<ReplayOutlinedIcon />}
                          >
                            Rejoin
                          </Button>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <EmptyState
                  title="No recent meetings"
                  description="Meetings you create or join will appear here for easy rejoining."
                />
              )}
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Join with Code Modal */}
      <Modal
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        title="Join a meeting"
        description="Enter the room code or paste an invite link to jump in:"
        actions={
          <>
            <Button variant="ghost" size="normal" onClick={() => setJoinModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="normal"
              disabled={!meetingCode.trim()}
              onClick={() => {
                setJoinModalOpen(false);
                handleJoinCall();
              }}
            >
              Join
            </Button>
          </>
        }
      >
        <Box sx={{ pt: 1 }}>
          <Input
            placeholder="e.g. xxxx-xxxx-xxxx or link"
            value={meetingCode}
            onChange={(e) => setMeetingCode(e.target.value)}
            prefixIcon={<KeyboardOutlinedIcon sx={{ fontSize: "20px" }} />}
            autoFocus
          />
        </Box>
      </Modal>

      {/* Invite Modal */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Meeting link created"
        description="Share this link with anyone you want to invite:"
        actions={
          <>
            <Button variant="ghost" size="normal" onClick={() => setInviteModalOpen(false)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="normal"
              onClick={() => handleJoinCall(createdRoom)}
            >
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
            sx={{ fontWeight: 600, color: c.textHeading, wordBreak: "break-all", fontFamily: "monospace" }}
          >
            {window.location.origin}/{createdRoom}
          </Typography>
          <IconButton
            tooltip="Copy link"
            variant="ghost"
            size="small"
            onClick={() => copyLink()}
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

      {/* Schedule Meeting Modal */}
      <Modal
        open={scheduleModalOpen}
        onClose={() => !schedLoading && setScheduleModalOpen(false)}
        title="Schedule a meeting"
        description="Plan ahead with calendar sync and invite notes:"
        actions={
          <>
            <Button
              variant="ghost"
              size="normal"
              disabled={schedLoading}
              onClick={() => setScheduleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="normal"
              loading={schedLoading}
              disabled={!schedTitle.trim() || !schedDateTime}
              onClick={handleCreateScheduledMeeting}
            >
              Schedule meeting
            </Button>
          </>
        }
      >
        <Box component="form" onSubmit={handleCreateScheduledMeeting} sx={{ pt: 1, display: "flex", flexDirection: "column" }}>
          <Input
            label="Meeting title"
            placeholder="e.g. Weekly Standup, Project Sync"
            value={schedTitle}
            onChange={(e) => setSchedTitle(e.target.value)}
            required
          />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={8}>
              <Input
                label="Date & time"
                type="datetime-local"
                value={schedDateTime}
                onChange={(e) => setSchedDateTime(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ mb: 2 }}>
                <Box
                  component="label"
                  sx={{
                    display: "block",
                    fontSize: tokens.typography.label.fontSize,
                    fontWeight: tokens.typography.label.weight,
                    fontFamily: tokens.typography.fonts.body,
                    color: c.textHeading,
                    mb: "6px"
                  }}
                >
                  Duration
                </Box>
                <FormControl fullWidth size="small">
                  <Select
                    value={schedDuration}
                    onChange={(e) => setSchedDuration(e.target.value)}
                    sx={{
                      borderRadius: tokens.radii.input,
                      height: tokens.buttonHeights.normal,
                      backgroundColor: c.surface,
                      fontSize: tokens.typography.input.fontSize
                    }}
                  >
                    <MenuItem value={15}>15 mins</MenuItem>
                    <MenuItem value={30}>30 mins</MenuItem>
                    <MenuItem value={45}>45 mins</MenuItem>
                    <MenuItem value={60}>1 hour</MenuItem>
                    <MenuItem value={90}>1.5 hours</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Grid>
          </Grid>

          <Input
            label="Description / Agenda (optional)"
            placeholder="Add meeting agenda or notes for attendees..."
            value={schedDescription}
            onChange={(e) => setSchedDescription(e.target.value)}
            multiline
            rows={2}
          />
        </Box>
      </Modal>

      {/* Toast Notification */}
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <Footer />
    </Box>
  );
}

export default withAuth(HomeComponent);
