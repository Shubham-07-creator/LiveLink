import React, { useContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { useThemeMode } from "../contexts/ThemeContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
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
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";

import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import VideoCallOutlinedIcon from "@mui/icons-material/VideoCallOutlined";

export default function History() {
  const { getHistoryOfUser, deleteHistory } = useContext(AuthContext);
  const themeContext = useThemeMode();
  const tokens = themeContext?.tokens || {};
  const c = tokens?.colors || {};
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  const showToast = (message, severity = "info") => {
    setToast({ open: true, message, severity });
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Recent session";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHistoryOfUser();
      setMeetings(data || []);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  }, [getHistoryOfUser]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    showToast(`Copied meeting code "${code}"`, "success");
  };

  const copyMeetingLink = (code) => {
    const link = `${window.location.origin}/${code}`;
    navigator.clipboard.writeText(link);
    showToast("Meeting link copied to clipboard", "success");
  };

  const promptDeleteOne = (id) => {
    setSelectedMeetingId(id);
    setIsClearingAll(false);
    setDeleteModalOpen(true);
  };

  const promptClearAll = () => {
    setIsClearingAll(true);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteModalOpen(false);
    if (isClearingAll) {
      try {
        await Promise.all(meetings.map((m) => deleteHistory(m._id)));
        setMeetings([]);
        showToast("All meeting records cleared", "success");
      } catch (e) {
        showToast("Failed to clear all meetings", "error");
      }
    } else if (selectedMeetingId) {
      try {
        await deleteHistory(selectedMeetingId);
        setMeetings((prev) => prev.filter((m) => m._id !== selectedMeetingId));
        showToast("Meeting removed from history", "success");
      } catch (err) {
        showToast("Could not delete meeting record", "error");
      }
    }
  };

  const filteredMeetings = meetings.filter((m) =>
    (m.meetingCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatDate(m.date).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: c.bg, color: c.textHeading }}>
      <Navbar />

      <Container maxWidth="md" sx={{ pt: { xs: 2.5, md: 5 }, pb: { xs: 12, md: 6 }, px: { xs: 2, sm: 3, md: 4 }, flexGrow: 1 }}>
        {/* Header (Single H1) */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography
              component="h1"
              sx={{
                fontFamily: tokens.typography.fonts.heading,
                fontWeight: tokens.typography.pageTitle.weight,
                fontSize: { xs: tokens.typography.pageTitle.mobile, md: tokens.typography.pageTitle.desktop },
                color: c.textHeading,
                letterSpacing: "-0.02em",
                mb: 0.5
              }}
            >
              Meeting history
            </Typography>
            <Typography variant="body2" sx={{ color: c.textMuted }}>
              Rejoin past calls, copy codes, or clean up call activity.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <Badge variant="primary">
              {meetings.length} {meetings.length === 1 ? "meeting" : "meetings"}
            </Badge>

            {meetings.length > 0 && (
              <Button
                variant="danger"
                size="small"
                onClick={promptClearAll}
                leftIcon={<DeleteSweepOutlinedIcon />}
              >
                Clear history
              </Button>
            )}
          </Box>
        </Box>

        {/* Live Search Bar */}
        {meetings.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by meeting code or date..."
              prefixIcon={<SearchOutlinedIcon sx={{ fontSize: "20px" }} />}
            />
          </Box>
        )}

        {/* Content list */}
        {loading ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} key={i}>
                <Skeleton variant="card" height={80} />
              </Grid>
            ))}
          </Grid>
        ) : meetings.length === 0 ? (
          <EmptyState
            icon={<VideoCallOutlinedIcon />}
            title="No call history yet"
            description="When you create or join meetings, your past sessions will show up here."
            action={
              <Button variant="primary" size="normal" onClick={() => navigate("/home")}>
                Start a meeting
              </Button>
            }
          />
        ) : filteredMeetings.length === 0 ? (
          <EmptyState
            icon={<SearchOutlinedIcon />}
            title="No meetings found"
            description={`No meeting records matched "${searchQuery}".`}
          />
        ) : (
          <Grid container spacing={2}>
            {filteredMeetings.map((m) => (
              <Grid item xs={12} key={m._id}>
                <Card
                  hoverLift
                  padding={2.5}
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    gap: 2
                  }}
                >
                  {/* Left meeting details */}
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Chip
                        label={m.meetingCode}
                        onClick={() => copyCode(m.meetingCode)}
                        sx={{ fontFamily: "monospace", fontSize: "14px" }}
                      />
                      <IconButton
                        tooltip="Copy code"
                        variant="ghost"
                        size="small"
                        onClick={() => copyCode(m.meetingCode)}
                      >
                        <ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, color: c.textMuted, fontSize: "13px" }}>
                        <CalendarTodayOutlinedIcon sx={{ fontSize: 14 }} />
                        <span>{formatDate(m.date)}</span>
                      </Box>
                      {m.duration > 0 && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: c.textMuted, fontSize: "13px" }}>
                          <AccessTimeOutlinedIcon sx={{ fontSize: 14 }} />
                          <span>{formatDuration(m.duration)}</span>
                        </Box>
                      )}
                      {m.participantCount > 0 && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: c.textMuted, fontSize: "13px" }}>
                          <GroupsOutlinedIcon sx={{ fontSize: 14 }} />
                          <span>{m.participantCount} {m.participantCount === 1 ? "attendee" : "attendees"}</span>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Right actions */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: { xs: "100%", sm: "auto" }, justifyContent: "flex-end" }}>
                    <IconButton
                      tooltip="Copy invite link"
                      variant="ghost"
                      size="small"
                      onClick={() => copyMeetingLink(m.meetingCode)}
                    >
                      <ContentCopyOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>

                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => navigate(`/${m.meetingCode}`)}
                      leftIcon={<PlayArrowOutlinedIcon />}
                    >
                      Rejoin
                    </Button>

                    <IconButton
                      tooltip="Delete from history"
                      variant="danger"
                      size="small"
                      onClick={() => promptDeleteOne(m._id)}
                    >
                      <DeleteOutlineOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={isClearingAll ? "Clear entire history?" : "Remove meeting record?"}
        description={
          isClearingAll
            ? "Are you sure you want to delete all past meeting records? This action cannot be undone."
            : "Are you sure you want to remove this meeting code from your history?"
        }
        actions={
          <>
            <Button variant="ghost" size="normal" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="normal" onClick={confirmDelete}>
              {isClearingAll ? "Yes, clear all" : "Yes, delete"}
            </Button>
          </>
        }
      />

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
