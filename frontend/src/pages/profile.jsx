import React, { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import withAuth from "../utils/withAuth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useThemeMode } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import {
  Button,
  IconButton,
  Card,
  Input,
  Badge,
  Modal,
  Toast,
  Skeleton
} from "../components/ui";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Grid from "@mui/material/Grid";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";

import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import MicNoneOutlinedIcon from "@mui/icons-material/MicNoneOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import NetworkCheckOutlinedIcon from "@mui/icons-material/NetworkCheckOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

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

  const { mode, setMode, isDark, tokens } = useThemeMode();
  const c = tokens.colors;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [avatarError, setAvatarError] = useState("");

  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [logoutAllDialogOpen, setLogoutAllDialogOpen] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  // Hardware & App Preferences
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

  const showToast = (message, severity = "info") => {
    setToast({ open: true, message, severity });
  };

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserProfile();
      if (data) {
        setName(data.name || "");
        setPhone(data.phone || "");
        setAvatar(data.avatar || AVATAR_PRESETS[0]);
        if (data.preferences) {
          if (typeof data.preferences.micMuted === "boolean") setPrefMicMuted(data.preferences.micMuted);
          if (typeof data.preferences.camOff === "boolean") setPrefCamOff(data.preferences.camOff);
          if (typeof data.preferences.soundChimes === "boolean") setPrefChimes(data.preferences.soundChimes);
          if (typeof data.preferences.lowBandwidth === "boolean") setPrefLowBw(data.preferences.lowBandwidth);
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

  const handleSendVerification = async () => {
    setVerifying(true);
    try {
      const res = await sendVerificationEmail();
      showToast(res?.message || "Verification email sent. Check your inbox.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not send verification email", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAllDevices();
      setLogoutAllDialogOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to logout from all devices", "error");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput.trim() !== "DELETE") return;
    try {
      await deleteAccount();
      setDeleteAccountDialogOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete account", "error");
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);

    if (avatar && !avatar.startsWith("https://")) {
      showToast("Avatar URL must start with https:// for security.", "error");
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
      localStorage.setItem("livelink_pref_mic_muted", String(prefMicMuted));
      localStorage.setItem("livelink_pref_cam_off", String(prefCamOff));
      localStorage.setItem("livelink_pref_chimes", String(prefChimes));
      localStorage.setItem("livelink_pref_low_bw", String(prefLowBw));
      localStorage.setItem("livelink_theme", mode);

      showToast("Profile settings saved successfully", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not update profile", "error");
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

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: c.bg, color: c.textHeading }}>
      <Navbar />

      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, flexGrow: 1 }}>
        {/* Page Title (Single H1) */}
        <Box sx={{ mb: 4 }}>
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
            Account settings
          </Typography>
          <Typography variant="body2" sx={{ color: c.textMuted }}>
            Manage your personal profile, meeting preferences, and security sessions.
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Skeleton variant="card" height={160} />
            <Skeleton variant="card" height={240} />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* 1. Profile Overview Card */}
            <Card padding={3.5}>
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "center", sm: "flex-start" }, gap: 3 }}>
                {/* 72px Avatar with edit button */}
                <Box sx={{ position: "relative" }}>
                  <Avatar
                    src={avatar}
                    alt={name}
                    sx={{
                      width: 72,
                      height: 72,
                      border: `2px solid ${c.primary}`,
                      bgcolor: c.primarySoftBg
                    }}
                  />
                  <Tooltip title="Change photo">
                    <IconButton
                      size="small"
                      shape="round"
                      onClick={() => setAvatarDialogOpen(true)}
                      sx={{
                        position: "absolute",
                        bottom: -4,
                        right: -4,
                        bgcolor: c.primary,
                        color: "#ffffff",
                        width: 28,
                        height: 28,
                        minWidth: 28,
                        minHeight: 28,
                        "&:hover": { bgcolor: c.primaryHover }
                      }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Details */}
                <Box sx={{ flexGrow: 1, textAlign: { xs: "center", sm: "left" } }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: { xs: "center", sm: "flex-start" }, gap: 1.5, flexWrap: "wrap", mb: 0.5 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: c.textHeading }}>
                      {name || "User"}
                    </Typography>
                    {userData?.emailVerified ? (
                      <Badge variant="success" dot>
                        Verified
                      </Badge>
                    ) : (
                      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                        <Badge variant="warning">
                          Unverified
                        </Badge>
                        <Button
                          variant="ghost"
                          size="small"
                          disabled={verifying}
                          onClick={handleSendVerification}
                        >
                          {verifying ? "Sending..." : "Verify email"}
                        </Button>
                      </Box>
                    )}
                  </Box>

                  <Typography variant="body2" sx={{ color: c.textMuted, mb: 2 }}>
                    {userData?.email || "No email linked"}
                  </Typography>

                  <Box sx={{ display: "flex", gap: 3, justifyContent: { xs: "center", sm: "flex-start" }, flexWrap: "wrap" }}>
                    <Typography variant="caption" sx={{ color: c.textMuted }}>
                      Handle: <strong>@{userData?.username || "user"}</strong>
                    </Typography>
                    <Typography variant="caption" sx={{ color: c.textMuted }}>
                      Total calls: <strong>{userData?.totalMeetings || 0}</strong>
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Card>

            {/* 2. Personal Information Form Card */}
            <Card padding={3.5}>
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
                Personal information
              </Typography>
              <Typography variant="body2" sx={{ color: c.textMuted, mb: 3 }}>
                Update your display name and contact information.
              </Typography>

              <Box component="form" onSubmit={handleSave}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <Input
                      label="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      prefixIcon={<PersonOutlineOutlinedIcon sx={{ fontSize: 18 }} />}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Input
                      label="Email address"
                      value={userData?.email || ""}
                      disabled
                      helperText="Primary email cannot be modified"
                      prefixIcon={<MailOutlineOutlinedIcon sx={{ fontSize: 18 }} />}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Input
                      label="Phone number"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      prefixIcon={<PhoneOutlinedIcon sx={{ fontSize: 18 }} />}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Input
                      label="Username"
                      value={userData?.username || ""}
                      disabled
                      helperText="Username handle is permanent"
                    />
                  </Grid>
                </Grid>

                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="normal"
                    loading={saving}
                  >
                    Save changes
                  </Button>
                </Box>
              </Box>
            </Card>

            {/* 3. Meeting Join Preferences Card */}
            <Card padding={3.5}>
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
                Meeting preferences
              </Typography>
              <Typography variant="body2" sx={{ color: c.textMuted, mb: 3 }}>
                Configure default audio and camera behaviors when entering a call.
              </Typography>

              <Grid container spacing={2}>
                {/* Pref: Mute mic */}
                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: tokens.radii.button,
                      bgcolor: isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
                      border: `1px solid ${c.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <MicNoneOutlinedIcon sx={{ color: c.primary, fontSize: 22 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: c.textHeading }}>
                          Mute mic upon entry
                        </Typography>
                        <Typography variant="caption" sx={{ color: c.textMuted }}>
                          Microphone starts muted
                        </Typography>
                      </Box>
                    </Box>
                    <Switch
                      checked={prefMicMuted}
                      onChange={(e) => setPrefMicMuted(e.target.checked)}
                      color="primary"
                    />
                  </Box>
                </Grid>

                {/* Pref: Cam off */}
                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: tokens.radii.button,
                      bgcolor: isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
                      border: `1px solid ${c.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <VideocamOutlinedIcon sx={{ color: c.primary, fontSize: 22 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: c.textHeading }}>
                          Camera off upon entry
                        </Typography>
                        <Typography variant="caption" sx={{ color: c.textMuted }}>
                          Video starts turned off
                        </Typography>
                      </Box>
                    </Box>
                    <Switch
                      checked={prefCamOff}
                      onChange={(e) => setPrefCamOff(e.target.checked)}
                      color="primary"
                    />
                  </Box>
                </Grid>

                {/* Pref: Chimes */}
                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: tokens.radii.button,
                      bgcolor: isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
                      border: `1px solid ${c.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <VolumeUpOutlinedIcon sx={{ color: c.success, fontSize: 22 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: c.textHeading }}>
                          Audio join/leave chimes
                        </Typography>
                        <Typography variant="caption" sx={{ color: c.textMuted }}>
                          Chime on member connect
                        </Typography>
                      </Box>
                    </Box>
                    <Switch
                      checked={prefChimes}
                      onChange={(e) => setPrefChimes(e.target.checked)}
                      color="primary"
                    />
                  </Box>
                </Grid>

                {/* Pref: Adaptive bandwidth */}
                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: tokens.radii.button,
                      bgcolor: isDark ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
                      border: `1px solid ${c.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <NetworkCheckOutlinedIcon sx={{ color: tokens.accent.dotAmber, fontSize: 22 }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: c.textHeading }}>
                          Adaptive bandwidth saver
                        </Typography>
                        <Typography variant="caption" sx={{ color: c.textMuted }}>
                          Optimized for weaker signals
                        </Typography>
                      </Box>
                    </Box>
                    <Switch
                      checked={prefLowBw}
                      onChange={(e) => setPrefLowBw(e.target.checked)}
                      color="primary"
                    />
                  </Box>
                </Grid>
              </Grid>

              {/* Theme Preference Pill Selector */}
              <Box sx={{ mt: 3, pt: 2.5, borderTop: `1px solid ${c.border}` }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: c.textHeading, mb: 1.5 }}>
                  Interface theme
                </Typography>
                <Box
                  sx={{
                    display: "inline-flex",
                    p: 0.5,
                    borderRadius: tokens.radii.button,
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                    border: `1px solid ${c.border}`
                  }}
                >
                  {["light", "dark"].map((themeChoice) => {
                    const isActive = mode === themeChoice;
                    return (
                      <Box
                        key={themeChoice}
                        onClick={() => setMode(themeChoice)}
                        sx={{
                          px: 2.5,
                          py: 0.8,
                          cursor: "pointer",
                          borderRadius: "10px",
                          fontWeight: 600,
                          fontSize: "13px",
                          textTransform: "capitalize",
                          color: isActive ? c.textHeading : c.textMuted,
                          backgroundColor: isActive ? c.surface : "transparent",
                          boxShadow: isActive ? (isDark ? "none" : "0 1px 3px rgba(0,0,0,0.08)") : "none",
                          transition: `all ${tokens.motion.micro}`
                        }}
                      >
                        {themeChoice}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Card>

            {/* 4. Security & Active Sessions Card */}
            <Card padding={3.5}>
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
                Security and sessions
              </Typography>
              <Typography variant="body2" sx={{ color: c.textMuted, mb: 3 }}>
                Manage authentication and sign out from other devices.
              </Typography>

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Button
                  variant="secondary"
                  size="normal"
                  onClick={() => setLogoutDialogOpen(true)}
                  leftIcon={<LogoutOutlinedIcon />}
                >
                  Sign out
                </Button>

                <Button
                  variant="secondary"
                  size="normal"
                  onClick={() => setLogoutAllDialogOpen(true)}
                  leftIcon={<LogoutOutlinedIcon />}
                >
                  Log out from all devices
                </Button>

                <Button
                  variant="ghost"
                  size="normal"
                  onClick={() => navigate("/history")}
                  leftIcon={<HistoryOutlinedIcon />}
                >
                  View call history
                </Button>
              </Box>
            </Card>

            {/* 5. Danger Zone Card */}
            <Card
              padding={3.5}
              sx={{
                border: `1px solid ${c.danger}`,
                backgroundColor: c.dangerSoftBg
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                <WarningAmberOutlinedIcon sx={{ color: c.danger, fontSize: 24, mt: 0.3 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontFamily: tokens.typography.fonts.heading,
                      fontWeight: 700,
                      fontSize: "16px",
                      color: c.danger,
                      mb: 0.5
                    }}
                  >
                    Danger zone
                  </Typography>
                  <Typography variant="body2" sx={{ color: c.textHeading, mb: 2.5, maxWidth: "520px" }}>
                    Permanently delete your LiveLink account and remove all personal meeting history. This action cannot be reversed.
                  </Typography>

                  <Button
                    variant="danger"
                    size="normal"
                    onClick={() => {
                      setDeleteConfirmInput("");
                      setDeleteAccountDialogOpen(true);
                    }}
                    leftIcon={<DeleteOutlineOutlinedIcon />}
                  >
                    Delete account
                  </Button>
                </Box>
              </Box>
            </Card>
          </Box>
        )}
      </Container>

      {/* Avatar Selection Modal */}
      <Modal
        open={avatarDialogOpen}
        onClose={() => setAvatarDialogOpen(false)}
        title="Choose your avatar"
        description="Select a preset avatar or provide an HTTPS image link:"
        actions={
          <Button variant="ghost" size="normal" onClick={() => setAvatarDialogOpen(false)}>
            Close
          </Button>
        }
      >
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, mb: 3 }}>
          {AVATAR_PRESETS.map((preset, idx) => (
            <Avatar
              key={idx}
              src={preset}
              onClick={() => {
                setAvatar(preset);
                setAvatarDialogOpen(false);
              }}
              sx={{
                width: 56,
                height: 56,
                cursor: "pointer",
                border: avatar === preset ? `3px solid ${c.primary}` : `2px solid ${c.border}`,
                transition: `all ${tokens.motion.micro}`,
                "&:hover": { transform: "scale(1.08)", borderColor: c.primary }
              }}
            />
          ))}
        </Box>

        <Box sx={{ pt: 1 }}>
          <Input
            label="Or custom HTTPS image URL"
            value={customAvatarUrl}
            onChange={(e) => setCustomAvatarUrl(e.target.value)}
            placeholder="https://example.com/photo.png"
            error={avatarError}
          />
          <Button
            variant="secondary"
            size="small"
            fullWidth
            onClick={handleApplyCustomAvatar}
          >
            Apply custom avatar
          </Button>
        </Box>
      </Modal>

      {/* Sign Out Modal */}
      <Modal
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        title="Sign out of LiveLink?"
        description="Are you sure you want to log out from this browser?"
        actions={
          <>
            <Button variant="ghost" size="normal" onClick={() => setLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="normal" onClick={handleLogout}>
              Sign out
            </Button>
          </>
        }
      />

      {/* Logout All Devices Modal */}
      <Modal
        open={logoutAllDialogOpen}
        onClose={() => setLogoutAllDialogOpen(false)}
        title="Log out from all devices?"
        description="This will invalidate all active sessions across phones, tablets, and computers."
        actions={
          <>
            <Button variant="ghost" size="normal" onClick={() => setLogoutAllDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="normal" onClick={handleLogoutAll}>
              Log out all devices
            </Button>
          </>
        }
      />

      {/* Delete Account Modal */}
      <Modal
        open={deleteAccountDialogOpen}
        onClose={() => setDeleteAccountDialogOpen(false)}
        title="Delete account permanently"
        description='To confirm account deletion, type "DELETE" in capital letters below:'
        actions={
          <>
            <Button variant="ghost" size="normal" onClick={() => setDeleteAccountDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="normal"
              disabled={deleteConfirmInput.trim() !== "DELETE"}
              onClick={handleDeleteAccount}
            >
              Permanently delete
            </Button>
          </>
        }
      >
        <Box sx={{ pt: 1 }}>
          <Input
            placeholder='Type "DELETE" to confirm'
            value={deleteConfirmInput}
            onChange={(e) => setDeleteConfirmInput(e.target.value)}
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

export default withAuth(ProfilePage);
