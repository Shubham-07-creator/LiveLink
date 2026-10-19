import React, { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import withAuth from "../utils/withAuth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
    Box,
    Container,
    Paper,
    Typography,
    Avatar,
    TextField,
    Button,
    Grid,
    Chip,
    Divider,
    Alert,
    CircularProgress,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Switch,
    Tooltip
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import VideocamIcon from "@mui/icons-material/Videocam";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import BadgeIcon from "@mui/icons-material/Badge";
import GoogleIcon from "@mui/icons-material/Google";
import SaveIcon from "@mui/icons-material/Save";
import LogoutIcon from "@mui/icons-material/Logout";
import MicIcon from "@mui/icons-material/Mic";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import NetworkCheckIcon from "@mui/icons-material/NetworkCheck";
import HistoryIcon from "@mui/icons-material/History";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useThemeMode } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";

const AVATAR_PRESETS = [
    "https://api.dicebear.com/7.x/bottts/svg?seed=LiveLink",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Aria",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Neo",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Cyber",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Alex",
    "https://api.dicebear.com/7.x/bottts/svg?seed=Sam",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Luna",
    "https://api.dicebear.com/7.x/adventurer/svg?seed=Milo",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Chloe",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Leo",
    "https://api.dicebear.com/7.x/lorelei/svg?seed=Zoe"
];

function ProfilePage() {
    const { 
        userData, 
        getUserProfile, 
        updateUserProfile, 
        handleLogout, 
        updatePreferences, 
        logoutAllDevices, 
        deleteAccount, 
        sendVerificationEmail 
    } = useContext(AuthContext);
    const { mode, setMode } = useThemeMode();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [avatar, setAvatar] = useState("");
    const [customAvatarUrl, setCustomAvatarUrl] = useState("");
    const [avatarError, setAvatarError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
    const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
    const [logoutAllDialogOpen, setLogoutAllDialogOpen] = useState(false);
    const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);

    // Hardware & App Preferences (stored in DB & localStorage)
    const [prefMicMuted, setPrefMicMuted] = useState(
        () => localStorage.getItem("livelink_pref_mic_muted") === "true"
    );
    const [prefCamOff, setPrefCamOff] = useState(
        () => localStorage.getItem("livelink_pref_cam_off") === "true"
    );
    const [prefChimes, setPrefChimes] = useState(
        () => localStorage.getItem("livelink_pref_chimes") !== "false"
    );
    const [prefLowBw, setPrefLowBw] = useState(
        () => localStorage.getItem("livelink_pref_low_bw") === "true"
    );

    const navigate = useNavigate();

    const loadProfile = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getUserProfile();
            if (data) {
                setName(data.name || "");
                setPhone(data.phone || "");
                setAvatar(data.avatar || AVATAR_PRESETS[0]);
                if (data.preferences) {
                    if (typeof data.preferences.micMuted === 'boolean') {
                        setPrefMicMuted(data.preferences.micMuted);
                        localStorage.setItem("livelink_pref_mic_muted", String(data.preferences.micMuted));
                    }
                    if (typeof data.preferences.camOff === 'boolean') {
                        setPrefCamOff(data.preferences.camOff);
                        localStorage.setItem("livelink_pref_cam_off", String(data.preferences.camOff));
                    }
                    if (typeof data.preferences.soundChimes === 'boolean') {
                        setPrefChimes(data.preferences.soundChimes);
                        localStorage.setItem("livelink_pref_chimes", String(data.preferences.soundChimes));
                    }
                    if (typeof data.preferences.lowBandwidth === 'boolean') {
                        setPrefLowBw(data.preferences.lowBandwidth);
                        localStorage.setItem("livelink_pref_low_bw", String(data.preferences.lowBandwidth));
                    }
                }
            }
        } catch (e) {
            console.warn("Could not load user profile:", e);
        } finally {
            setLoading(false);
        }
    }, [getUserProfile]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const [logoutAllLoading, setLogoutAllLoading] = useState(false);
    const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

    const handleSendVerification = async () => {
        setVerifying(true);
        setErrorMsg("");
        setSuccessMsg("");
        try {
            const res = await sendVerificationEmail();
            setSuccessMsg(res?.message || "Verification email sent! Check your inbox.");
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Could not send verification email.");
        } finally {
            setVerifying(false);
        }
    };

    const handleLogoutAll = async () => {
        setLogoutAllLoading(true);
        try {
            await logoutAllDevices();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to logout from all devices.");
        } finally {
            setLogoutAllLoading(false);
            setLogoutAllDialogOpen(false);
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteAccountLoading(true);
        try {
            await deleteAccount();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to delete account.");
        } finally {
            setDeleteAccountLoading(false);
            setDeleteAccountDialogOpen(false);
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        setErrorMsg("");
        setSuccessMsg("");

        if (avatar && !avatar.startsWith("https://")) {
            setErrorMsg("Avatar URL must start with https:// for security.");
            setSaving(false);
            return;
        }

        try {
            await updateUserProfile({ name, phone, avatar });
            await updatePreferences({
                micMuted: prefMicMuted,
                camOff: prefCamOff,
                soundChimes: prefChimes,
                lowBandwidth: prefLowBw,
                theme: mode
            });
            // Also sync to localStorage
            localStorage.setItem("livelink_pref_mic_muted", String(prefMicMuted));
            localStorage.setItem("livelink_pref_cam_off", String(prefCamOff));
            localStorage.setItem("livelink_pref_chimes", String(prefChimes));
            localStorage.setItem("livelink_pref_low_bw", String(prefLowBw));
            localStorage.setItem("livelink_theme", mode);

            setSuccessMsg("Profile and meeting preferences saved successfully to database!");
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Could not update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleApplyCustomAvatar = () => {
        const cleanUrl = customAvatarUrl.trim();
        if (!cleanUrl) return;
        if (!cleanUrl.startsWith("https://")) {
            setAvatarError("Avatar image URL must start with https:// for security.");
            return;
        }
        setAvatarError("");
        setAvatar(cleanUrl);
        setAvatarDialogOpen(false);
        setCustomAvatarUrl("");
    };

    if (loading) {
        return (
            <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
                <Navbar />
                <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CircularProgress sx={{ color: "#2563eb" }} />
                </Box>
                <Footer />
            </Box>
        );
    }

    const memberDate = userData?.createdAt
        ? new Date(userData.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "Member";

    return (
        <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#f8fafc" }}>
            <Navbar />

            <Container maxWidth="md" sx={{ py: { xs: 3.5, md: 5 }, flexGrow: 1 }}>
                {/* =========================================================================
                    1. USER IDENTITY BANNER
                    ========================================================================= */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3, sm: 4 },
                        borderRadius: "24px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#ffffff",
                        mb: 4,
                        boxShadow: "0 4px 24px rgba(0,0,0,0.03)"
                    }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: { xs: "center", sm: "flex-start" },
                            gap: 3.5
                        }}
                    >
                        {/* Avatar with edit badge */}
                        <Box sx={{ position: "relative" }}>
                            <Avatar
                                src={avatar}
                                alt={name}
                                sx={{
                                    width: 104,
                                    height: 104,
                                    border: "3.5px solid #2563eb",
                                    boxShadow: "0 8px 24px rgba(37, 99, 235, 0.25)",
                                    backgroundColor: "#f1f5f9"
                                }}
                            />
                            <Tooltip title="Change Avatar">
                                <IconButton
                                    size="small"
                                    onClick={() => setAvatarDialogOpen(true)}
                                    sx={{
                                        position: "absolute",
                                        bottom: 2,
                                        right: 2,
                                        backgroundColor: "#2563eb",
                                        color: "#ffffff",
                                        "&:hover": { backgroundColor: "#1d4ed8" },
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.25)"
                                    }}
                                >
                                    <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        {/* User basic info */}
                        <Box sx={{ flexGrow: 1, textAlign: { xs: "center", sm: "left" } }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "center", sm: "flex-start" }, gap: 1.2, flexWrap: "wrap", mb: 0.8 }}>
                                <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                    {name || userData?.name || "User"}
                                </Typography>
                                <Chip
                                    label={`@${userData?.username || "username"}`}
                                    size="small"
                                    sx={{
                                        backgroundColor: "rgba(37, 99, 235, 0.1)",
                                        color: "#2563eb",
                                        fontWeight: 700,
                                        borderRadius: "8px"
                                    }}
                                />
                                {userData?.isGoogleUser && (
                                    <Chip
                                        icon={<GoogleIcon sx={{ fontSize: "14px !important" }} />}
                                        label="Google Account"
                                        size="small"
                                        sx={{ backgroundColor: "#f1f5f9", color: "#475569", fontWeight: 600 }}
                                    />
                                )}
                                {userData?.emailVerified ? (
                                    <Chip
                                        icon={<CheckCircleIcon sx={{ fontSize: "14px !important", color: "#16a34a !important" }} />}
                                        label="Verified Member"
                                        size="small"
                                        sx={{ backgroundColor: "rgba(22, 163, 74, 0.08)", color: "#16a34a", fontWeight: 700 }}
                                    />
                                ) : (
                                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.8 }}>
                                        <Chip
                                            label="Unverified Email"
                                            size="small"
                                            sx={{ backgroundColor: "rgba(245, 158, 11, 0.12)", color: "#d97706", fontWeight: 700 }}
                                        />
                                        <Button
                                            size="small"
                                            disabled={verifying}
                                            onClick={handleSendVerification}
                                            sx={{
                                                fontSize: "0.75rem",
                                                textTransform: "none",
                                                fontWeight: 700,
                                                color: "#2563eb",
                                                py: "2px",
                                                px: "8px",
                                                minWidth: 0,
                                                borderRadius: "6px",
                                                border: "1px solid rgba(37, 99, 235, 0.3)",
                                                "&:hover": { backgroundColor: "rgba(37, 99, 235, 0.05)" }
                                            }}
                                        >
                                            {verifying ? "Sending..." : "Verify Now"}
                                        </Button>
                                    </Box>
                                )}
                            </Box>

                            <Typography variant="body2" sx={{ color: "#64748b", mb: 2.5 }}>
                                {userData?.email || "No email linked"}
                            </Typography>

                            {/* Stat badges */}
                            <Box sx={{ display: "flex", gap: 3, justifyContent: { xs: "center", sm: "flex-start" }, flexWrap: "wrap" }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, color: "#475569", fontSize: "0.88rem" }}>
                                    <VideocamIcon sx={{ color: "#2563eb", fontSize: 20 }} />
                                    <span><strong>{userData?.totalMeetings || 0}</strong> Meetings Attended</span>
                                </Box>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, color: "#475569", fontSize: "0.88rem" }}>
                                    <CalendarMonthIcon sx={{ color: "#64748b", fontSize: 18 }} />
                                    <span>Joined {memberDate}</span>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Paper>

                {/* =========================================================================
                    2. EDIT DETAILS & HARDWARE PREFERENCES
                    ========================================================================= */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3, sm: 4 },
                        borderRadius: "24px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.03)",
                        mb: 4
                    }}
                >
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", mb: 0.5 }}>
                        Account Information
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748b", mb: 3 }}>
                        Update your personal profile details to keep your meeting identity accurate.
                    </Typography>

                    {successMsg && (
                        <Alert severity="success" sx={{ mb: 3, borderRadius: "12px", fontWeight: 600 }}>
                            {successMsg}
                        </Alert>
                    )}
                    {errorMsg && (
                        <Alert severity="error" sx={{ mb: 3, borderRadius: "12px", fontWeight: 600 }}>
                            {errorMsg}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleSave}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    variant="outlined"
                                    required
                                    InputProps={{
                                        startAdornment: <BadgeIcon sx={{ color: "#94a3b8", mr: 1, fontSize: 20 }} />
                                    }}
                                    sx={{
                                        "& .MuiOutlinedInput-root": { borderRadius: "12px" }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Username"
                                    value={userData?.username || ""}
                                    variant="outlined"
                                    disabled
                                    helperText="Username handle is permanent"
                                    sx={{
                                        "& .MuiOutlinedInput-root": { borderRadius: "12px" }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Email Address"
                                    value={userData?.email || ""}
                                    variant="outlined"
                                    disabled
                                    helperText="Primary authentication email"
                                    InputProps={{
                                        startAdornment: <EmailIcon sx={{ color: "#94a3b8", mr: 1, fontSize: 20 }} />
                                    }}
                                    sx={{
                                        "& .MuiOutlinedInput-root": { borderRadius: "12px" }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    placeholder="+91 98765 43210"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    variant="outlined"
                                    InputProps={{
                                        startAdornment: <PhoneIcon sx={{ color: "#94a3b8", mr: 1, fontSize: 20 }} />
                                    }}
                                    sx={{
                                        "& .MuiOutlinedInput-root": { borderRadius: "12px" }
                                    }}
                                />
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 4, borderColor: "#e2e8f0" }} />

                        {/* =========================================================================
                            3. DEFAULT MEETING PREFERENCES (HARDWARE & AUDIO)
                            ========================================================================= */}
                        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a", mb: 0.5 }}>
                            Meeting Join Preferences
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#64748b", mb: 2.5 }}>
                            Customize your default hardware states when connecting to any room.
                        </Typography>

                        <Grid container spacing={2.5} sx={{ mb: 3 }}>
                            <Grid item xs={12} sm={6}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: "14px",
                                        backgroundColor: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between"
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <MicIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                                                Mute mic upon entry
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "#64748b" }}>
                                                Start calls with microphone muted
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Switch
                                        checked={prefMicMuted}
                                        onChange={(e) => setPrefMicMuted(e.target.checked)}
                                        color="primary"
                                    />
                                </Paper>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: "14px",
                                        backgroundColor: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between"
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <VideocamIcon sx={{ color: "#2563eb", fontSize: 22 }} />
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                                                Camera off upon entry
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "#64748b" }}>
                                                Start calls with webcam turned off
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Switch
                                        checked={prefCamOff}
                                        onChange={(e) => setPrefCamOff(e.target.checked)}
                                        color="primary"
                                    />
                                </Paper>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: "14px",
                                        backgroundColor: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between"
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <VolumeUpIcon sx={{ color: "#16a34a", fontSize: 22 }} />
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                                                Join &amp; leave audio chimes
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "#64748b" }}>
                                                Play sound when members connect
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Switch
                                        checked={prefChimes}
                                        onChange={(e) => setPrefChimes(e.target.checked)}
                                        color="primary"
                                    />
                                </Paper>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: "14px",
                                        backgroundColor: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between"
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        <NetworkCheckIcon sx={{ color: "#f59e0b", fontSize: 22 }} />
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: "#0f172a" }}>
                                                Adaptive bitrate saver
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "#64748b" }}>
                                                Optimize video for weaker signals
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Switch
                                        checked={prefLowBw}
                                        onChange={(e) => setPrefLowBw(e.target.checked)}
                                        color="primary"
                                    />
                                </Paper>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: "14px",
                                        backgroundColor: mode === "dark" ? "background.default" : "#f8fafc",
                                        border: "1px solid",
                                        borderColor: "divider",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between"
                                    }}
                                >
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                        {mode === "dark" ? <DarkModeIcon sx={{ color: "#60a5fa", fontSize: 22 }} /> : <LightModeIcon sx={{ color: "#f59e0b", fontSize: 22 }} />}
                                        <Box>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                                                Dark theme mode
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                                {mode === "dark" ? "Dark mode active" : "Light mode active"}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Switch
                                        checked={mode === "dark"}
                                        onChange={(e) => setMode(e.target.checked ? "dark" : "light")}
                                        color="primary"
                                    />
                                </Paper>
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 4, borderColor: "#e2e8f0" }} />

                        {/* Action buttons */}
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                            <Button
                                variant="outlined"
                                onClick={() => navigate("/history")}
                                startIcon={<HistoryIcon />}
                                sx={{
                                    color: "#475569",
                                    borderColor: "#cbd5e1",
                                    borderRadius: "12px",
                                    textTransform: "none",
                                    fontWeight: 700,
                                    py: 1,
                                    px: 2.5,
                                    "&:hover": { borderColor: "#94a3b8", backgroundColor: "#f8fafc" }
                                }}
                            >
                                View Call History
                            </Button>

                            <Button
                                type="submit"
                                variant="contained"
                                disabled={saving}
                                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                                sx={{
                                    backgroundColor: "#2563eb",
                                    color: "#ffffff",
                                    fontWeight: 700,
                                    px: 4.5,
                                    py: 1.2,
                                    borderRadius: "12px",
                                    textTransform: "none",
                                    fontSize: "0.95rem",
                                    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                                    "&:hover": {
                                        backgroundColor: "#1d4ed8",
                                        boxShadow: "0 6px 18px rgba(37, 99, 235, 0.35)"
                                    }
                                }}
                            >
                                {saving ? "Saving Changes..." : "Save All Changes"}
                            </Button>
                        </Box>
                    </Box>
                </Paper>

                {/* =========================================================================
                    4. SECURITY & SESSION MANAGEMENT
                    ========================================================================= */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 3, sm: 4 },
                        borderRadius: "24px",
                        border: "1px solid #fee2e2",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.02)"
                    }}
                >
                    <Box sx={{ mb: 2.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
                            Active Sessions &amp; Account Control
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#64748b" }}>
                            Logged in as {userData?.email || userData?.username}. Manage your session security or permanently delete your account.
                        </Typography>
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => setLogoutDialogOpen(true)}
                                startIcon={<LogoutIcon />}
                                sx={{
                                    color: "#475569",
                                    borderColor: "#cbd5e1",
                                    borderRadius: "12px",
                                    textTransform: "none",
                                    fontWeight: 700,
                                    py: 1.2,
                                    "&:hover": { backgroundColor: "#f8fafc", borderColor: "#94a3b8" }
                                }}
                            >
                                Sign Out (This Device)
                            </Button>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => setLogoutAllDialogOpen(true)}
                                startIcon={<LogoutIcon />}
                                sx={{
                                    color: "#d97706",
                                    borderColor: "#fde68a",
                                    backgroundColor: "#fffbeb",
                                    borderRadius: "12px",
                                    textTransform: "none",
                                    fontWeight: 700,
                                    py: 1.2,
                                    "&:hover": { backgroundColor: "#fef3c7", borderColor: "#f59e0b" }
                                }}
                            >
                                Logout All Devices
                            </Button>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => setDeleteAccountDialogOpen(true)}
                                startIcon={<CloseIcon />}
                                sx={{
                                    color: "#dc2626",
                                    borderColor: "#fca5a5",
                                    backgroundColor: "#fff5f5",
                                    borderRadius: "12px",
                                    textTransform: "none",
                                    fontWeight: 700,
                                    py: 1.2,
                                    "&:hover": { backgroundColor: "#fee2e2", borderColor: "#dc2626" }
                                }}
                            >
                                Delete Account
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
            </Container>

            {/* =========================================================================
                5. AVATAR SELECTION MODAL WITH CUSTOM URL INPUT
                ========================================================================= */}
            <Dialog
                open={avatarDialogOpen}
                onClose={() => setAvatarDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: "24px", p: 1.5 } }}
            >
                <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
                        Choose Profile Avatar
                    </Typography>
                    <IconButton size="small" onClick={() => setAvatarDialogOpen(false)}>
                        <CloseIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    <Typography variant="body2" sx={{ color: "#64748b", mb: 2.5 }}>
                        Select from one of our clean vector avatars or paste a custom image URL:
                    </Typography>

                    <Grid container spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                        {AVATAR_PRESETS.map((preset, idx) => (
                            <Grid item key={idx}>
                                <Avatar
                                    src={preset}
                                    onClick={() => {
                                        setAvatar(preset);
                                        setAvatarDialogOpen(false);
                                    }}
                                    sx={{
                                        width: 68,
                                        height: 68,
                                        cursor: "pointer",
                                        border: avatar === preset ? "3.5px solid #2563eb" : "2px solid #e2e8f0",
                                        backgroundColor: "#f8fafc",
                                        transition: "transform 0.2s, border-color 0.2s",
                                        "&:hover": {
                                            transform: "scale(1.1)",
                                            borderColor: "#2563eb"
                                        }
                                    }}
                                />
                            </Grid>
                        ))}
                    </Grid>

                    <Divider sx={{ my: 2, borderColor: "#e2e8f0" }} />

                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>
                        Or Use Custom Avatar URL (Must start with https://)
                    </Typography>
                    {avatarError && (
                        <Alert severity="error" sx={{ mb: 1.5, borderRadius: "10px", fontSize: "0.85rem" }} onClose={() => setAvatarError("")}>
                            {avatarError}
                        </Alert>
                    )}
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="https://example.com/avatar.jpg"
                            value={customAvatarUrl}
                            onChange={(e) => setCustomAvatarUrl(e.target.value)}
                            sx={{ "& .MuiOutlinedInput-root": { borderRadius: "10px" } }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleApplyCustomAvatar}
                            disabled={!customAvatarUrl.trim()}
                            sx={{
                                backgroundColor: "#2563eb",
                                textTransform: "none",
                                fontWeight: 700,
                                borderRadius: "10px",
                                px: 3,
                                "&:hover": { backgroundColor: "#1d4ed8" }
                            }}
                        >
                            Apply
                        </Button>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setAvatarDialogOpen(false)} sx={{ textTransform: "none", color: "#64748b", fontWeight: 600 }}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Logout Confirmation Dialog */}
            <Dialog
                open={logoutDialogOpen}
                onClose={() => setLogoutDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>
                    Sign Out of LiveLink?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="#64748b">
                        Are you sure you want to end your active session on this device?
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setLogoutDialogOpen(false)} sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleLogout}
                        sx={{
                            backgroundColor: "#dc2626",
                            color: "#ffffff",
                            textTransform: "none",
                            fontWeight: 700,
                            borderRadius: "10px",
                            "&:hover": { backgroundColor: "#b91c1c" }
                        }}
                    >
                        Yes, Sign Out
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Logout All Devices Confirmation Dialog */}
            <Dialog
                open={logoutAllDialogOpen}
                onClose={() => !logoutAllLoading && setLogoutAllDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#0f172a" }}>
                    Logout From All Devices?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="#64748b">
                        This will revoke all active sessions across all your browsers and mobile devices. You will be logged out here as well and need to sign in again.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button 
                        disabled={logoutAllLoading} 
                        onClick={() => setLogoutAllDialogOpen(false)} 
                        sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        disabled={logoutAllLoading}
                        onClick={handleLogoutAll}
                        startIcon={logoutAllLoading ? <CircularProgress size={16} color="inherit" /> : null}
                        sx={{
                            backgroundColor: "#d97706",
                            color: "#ffffff",
                            textTransform: "none",
                            fontWeight: 700,
                            borderRadius: "10px",
                            "&:hover": { backgroundColor: "#b45309" }
                        }}
                    >
                        {logoutAllLoading ? "Logging Out..." : "Yes, Logout All Devices"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Account Confirmation Dialog */}
            <Dialog
                open={deleteAccountDialogOpen}
                onClose={() => !deleteAccountLoading && setDeleteAccountDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 800, color: "#dc2626" }}>
                    Permanently Delete Account?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="#64748b">
                        Warning: This action is permanent and cannot be undone. All your profile information, meeting history, and scheduled sessions will be erased immediately.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button 
                        disabled={deleteAccountLoading} 
                        onClick={() => setDeleteAccountDialogOpen(false)} 
                        sx={{ color: "#64748b", textTransform: "none", fontWeight: 600 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        disabled={deleteAccountLoading}
                        onClick={handleDeleteAccount}
                        startIcon={deleteAccountLoading ? <CircularProgress size={16} color="inherit" /> : null}
                        sx={{
                            backgroundColor: "#dc2626",
                            color: "#ffffff",
                            textTransform: "none",
                            fontWeight: 700,
                            borderRadius: "10px",
                            "&:hover": { backgroundColor: "#b91c1c" }
                        }}
                    >
                        {deleteAccountLoading ? "Deleting..." : "Permanently Delete"}
                    </Button>
                </DialogActions>
            </Dialog>

            <Footer />
        </Box>
    );
}

export default withAuth(ProfilePage);
