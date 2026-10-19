import React, { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
    Box,
    Container,
    Typography,
    Paper,
    Button,
    Grid,
    IconButton,
    Chip,
    Snackbar,
    Alert,
    Tooltip,
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Skeleton
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import VideocamIcon from "@mui/icons-material/Videocam";
import SearchIcon from "@mui/icons-material/Search";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import GroupsIcon from "@mui/icons-material/Groups";

export default function History() {
    const { getHistoryOfUser, deleteHistory } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [toastMsg, setToastMsg] = useState("");
    const [toastOpen, setToastOpen] = useState(false);

    const formatDuration = (seconds) => {
        if (!seconds || seconds <= 0) return null;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs}s`;
        if (secs === 0) return `${mins}m`;
        return `${mins}m ${secs}s`;
    };

    // Delete Modal Dialog State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedMeetingId, setSelectedMeetingId] = useState(null);
    const [isClearingAll, setIsClearingAll] = useState(false);

    const navigate = useNavigate();

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
        setToastMsg(`Copied meeting code "${code}" to clipboard!`);
        setToastOpen(true);
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
                // Delete all sequentially or in parallel
                await Promise.all(meetings.map(m => deleteHistory(m._id)));
                setMeetings([]);
                setToastMsg("All meeting records cleared.");
                setToastOpen(true);
            } catch (e) {
                setToastMsg("Failed to clear all meetings.");
                setToastOpen(true);
            }
        } else if (selectedMeetingId) {
            try {
                await deleteHistory(selectedMeetingId);
                setMeetings(prev => prev.filter((m) => m._id !== selectedMeetingId));
                setToastMsg("Meeting removed from history.");
                setToastOpen(true);
            } catch (err) {
                setToastMsg("Could not delete meeting record.");
                setToastOpen(true);
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "Recent Session";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const filteredMeetings = meetings.filter(m =>
        (m.meetingCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatDate(m.date).toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
            <Navbar />

            <Container maxWidth="md" sx={{ py: 5, flexGrow: 1 }}>
                {/* Header & Stats Banner */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4, flexWrap: "wrap", gap: 2 }}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary", mb: 0.5 }}>
                            Call History
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            Rejoin previous rooms, copy meeting codes, or manage past call records.
                        </Typography>
                    </Box>

                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                        <Chip
                            label={`${meetings.length} Total Meetings`}
                            sx={{
                                backgroundColor: "rgba(37, 99, 235, 0.1)",
                                color: "#2563eb",
                                fontWeight: 700,
                                borderRadius: "10px",
                                px: 1,
                                py: 2
                            }}
                        />
                        {meetings.length > 0 && (
                            <Button
                                startIcon={<DeleteSweepIcon sx={{ fontSize: 18 }} />}
                                onClick={promptClearAll}
                                size="small"
                                sx={{
                                    color: "#dc2626",
                                    border: "1px solid #fee2e2",
                                    backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.15)" : "#fef2f2",
                                    borderRadius: "10px",
                                    textTransform: "none",
                                    fontWeight: 600,
                                    "&:hover": { backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.25)" : "#fee2e2" }
                                }}
                            >
                                Clear All
                            </Button>
                        )}
                    </Box>
                </Box>

                {/* Search Bar */}
                {meetings.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search by meeting code or date..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: "text.secondary" }} />
                                    </InputAdornment>
                                )
                            }}
                            sx={{
                                bgcolor: "background.paper",
                                borderRadius: "12px",
                                "& .MuiOutlinedInput-root": {
                                    borderRadius: "12px",
                                    borderColor: "divider"
                                }
                            }}
                        />
                    </Box>
                )}

                {/* Content */}
                {loading ? (
                    <Grid container spacing={2}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Grid item xs={12} key={i}>
                                <Skeleton variant="rounded" height={76} sx={{ borderRadius: "14px" }} />
                            </Grid>
                        ))}
                    </Grid>
                ) : meetings.length === 0 ? (
                    <Paper
                        elevation={0}
                        sx={{
                            p: 6,
                            textAlign: "center",
                            borderRadius: "20px",
                            border: "1px dashed",
                            borderColor: "divider",
                            bgcolor: "background.paper"
                        }}
                    >
                        <VideocamIcon sx={{ fontSize: 52, color: "text.secondary", mb: 2, opacity: 0.5 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}>
                            No Meeting History Yet
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                            Your past video calls and joined rooms will automatically appear here.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => navigate("/home")}
                            sx={{
                                backgroundColor: "#2563eb",
                                color: "#ffffff",
                                fontWeight: 700,
                                borderRadius: "10px",
                                textTransform: "none",
                                px: 3,
                                "&:hover": { backgroundColor: "#1d4ed8" }
                            }}
                        >
                            Start a Meeting Now
                        </Button>
                    </Paper>
                ) : filteredMeetings.length === 0 ? (
                    <Paper elevation={0} sx={{ p: 5, textAlign: "center", borderRadius: "16px", bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
                        <Typography variant="body1" sx={{ color: "text.secondary" }}>
                            No meetings found matching "<strong>{searchQuery}</strong>".
                        </Typography>
                    </Paper>
                ) : (
                    <Grid container spacing={2}>
                        {filteredMeetings.map((m) => (
                            <Grid item xs={12} key={m._id}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2.5,
                                        borderRadius: "16px",
                                        border: 1,
                                        borderColor: "divider",
                                        bgcolor: "background.paper",
                                        display: "flex",
                                        flexDirection: { xs: "column", sm: "row" },
                                        justifyContent: "space-between",
                                        alignItems: { xs: "flex-start", sm: "center" },
                                        gap: 2,
                                        transition: "transform 0.15s, box-shadow 0.15s",
                                        "&:hover": {
                                            transform: "translateY(-2px)",
                                            boxShadow: (theme) => theme.palette.mode === "dark" ? "0 8px 24px rgba(0,0,0,0.3)" : "0 8px 24px rgba(0,0,0,0.04)"
                                        }
                                    }}
                                >
                                    {/* Left info */}
                                    <Box>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.8 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary", letterSpacing: "-0.3px" }}>
                                                {m.meetingCode}
                                            </Typography>
                                            <Tooltip title="Copy Code">
                                                <IconButton size="small" onClick={() => copyCode(m.meetingCode)} sx={{ color: "text.secondary" }}>
                                                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, color: "text.secondary" }}>
                                                <CalendarTodayIcon sx={{ fontSize: 14 }} />
                                                <Typography variant="body2" sx={{ fontSize: "0.85rem" }}>
                                                    {formatDate(m.date)}
                                                </Typography>
                                            </Box>
                                            {m.duration > 0 && (
                                                <Chip
                                                    icon={<AccessTimeIcon sx={{ fontSize: "13px !important" }} />}
                                                    label={formatDuration(m.duration)}
                                                    size="small"
                                                    sx={{
                                                        height: 22,
                                                        fontSize: "0.75rem",
                                                        backgroundColor: "rgba(37, 99, 235, 0.08)",
                                                        color: "#2563eb",
                                                        fontWeight: 700
                                                    }}
                                                />
                                            )}
                                            {m.participantCount > 0 && (
                                                <Chip
                                                    icon={<GroupsIcon sx={{ fontSize: "14px !important" }} />}
                                                    label={`${m.participantCount} ${m.participantCount === 1 ? 'attendee' : 'attendees'}`}
                                                    size="small"
                                                    sx={{
                                                        height: 22,
                                                        fontSize: "0.75rem",
                                                        backgroundColor: "rgba(16, 185, 129, 0.08)",
                                                        color: "#16a34a",
                                                        fontWeight: 700
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* Right actions */}
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: { xs: "100%", sm: "auto" }, justifyContent: "flex-end" }}>
                                        <Button
                                            variant="contained"
                                            startIcon={<PlayArrowIcon sx={{ fontSize: 18 }} />}
                                            onClick={() => navigate(`/${m.meetingCode}`)}
                                            sx={{
                                                backgroundColor: "rgba(37, 99, 235, 0.1)",
                                                color: "#2563eb",
                                                fontWeight: 700,
                                                borderRadius: "10px",
                                                textTransform: "none",
                                                px: 2,
                                                py: 0.8,
                                                boxShadow: "none",
                                                "&:hover": {
                                                    backgroundColor: "#2563eb",
                                                    color: "#ffffff",
                                                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)"
                                                }
                                            }}
                                        >
                                            Rejoin Call
                                        </Button>

                                        <Tooltip title="Delete record">
                                            <IconButton
                                                size="small"
                                                onClick={() => promptDeleteOne(m._id)}
                                                sx={{
                                                    color: "#94a3b8",
                                                    "&:hover": { color: "#ef4444", backgroundColor: "#fef2f2" }
                                                }}
                                            >
                                                <DeleteIcon sx={{ fontSize: 19 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Container>

            {/* Confirmation Dialog */}
            <Dialog
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                PaperProps={{ sx: { borderRadius: "16px", p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>
                    {isClearingAll ? "Clear Entire Call History?" : "Remove Meeting Record?"}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="#64748b">
                        {isClearingAll
                            ? "Are you sure you want to delete all past meeting records? This action cannot be undone."
                            : "Are you sure you want to remove this meeting code from your personal history?"}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteModalOpen(false)} sx={{ color: "#64748b", textTransform: "none" }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={confirmDelete}
                        sx={{
                            backgroundColor: "#dc2626",
                            color: "#ffffff",
                            textTransform: "none",
                            fontWeight: 700,
                            borderRadius: "10px",
                            "&:hover": { backgroundColor: "#b91c1c" }
                        }}
                    >
                        {isClearingAll ? "Yes, Clear All" : "Yes, Delete"}
                    </Button>
                </DialogActions>
            </Dialog>

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

            <Footer />
        </Box>
    );
}