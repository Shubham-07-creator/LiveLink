import React, { useState, useContext, useEffect, useMemo } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useThemeMode } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { generateRoomCode } from "../utils/roomCode";
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Divider,
    Alert,
    CircularProgress,
    IconButton,
    InputAdornment,
    Tab,
    Tabs,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip
} from "@mui/material";
import axios from "axios";
import server from "../environment";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import EmailIcon from "@mui/icons-material/Email";
import BadgeIcon from "@mui/icons-material/Badge";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

export default function Authentication() {
    const [tab, setTab] = useState(0); // 0 = Sign In, 1 = Create Account
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    // Sign In fields (Real Email + Password)
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");

    // Sign Up fields (Real Email + Name + Password)
    const [name, setName] = useState("");
    const [signupEmail, setSignupEmail] = useState("");
    const [signupPassword, setSignupPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Forgot / Reset Password state
    const [forgotModalOpen, setForgotModalOpen] = useState(false);
    const [resetStep, setResetStep] = useState(1); // 1 = enter email, 2 = enter token + new password
    const [forgotEmail, setForgotEmail] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMsg, setForgotMsg] = useState("");
    const [forgotError, setForgotError] = useState("");

    const navigate = useNavigate();
    const { handleLogin, handleRegister, handleGoogleAuth } = useContext(AuthContext);
    const { mode, toggleTheme } = useThemeMode();

    // Password strength evaluator
    const evaluatePasswordStrength = (pass) => {
        if (!pass) return { score: 0, label: "", color: "#94a3b8" };
        let score = 0;
        if (pass.length >= 6) score += 1;
        if (pass.length >= 10) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass) || (/[A-Z]/.test(pass) && /[a-z]/.test(pass))) score += 1;

        if (pass.length < 6) return { score: 1, label: "Too short (min 6 chars)", color: "#ef4444" };
        if (score <= 1) return { score: 1, label: "Weak", color: "#ef4444" };
        if (score === 2) return { score: 2, label: "Fair", color: "#f59e0b" };
        if (score === 3) return { score: 3, label: "Good", color: "#2563eb" };
        return { score: 4, label: "Strong", color: "#16a34a" };
    };

    const signupStrength = useMemo(() => evaluatePasswordStrength(signupPassword), [signupPassword]);
    const resetStrength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);

    const clearFieldError = (fieldName) => {
        setFieldErrors((prev) => {
            if (!prev[fieldName]) return prev;
            const updated = { ...prev };
            delete updated[fieldName];
            return updated;
        });
    };

    // Auto verify email or prefill reset token from URL parameters
    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const verifyToken = queryParams.get("verify_token") || queryParams.get("token");
        const resetParam = queryParams.get("reset_token");

        if (verifyToken && (window.location.pathname.includes("verify") || queryParams.get("action") === "verify")) {
            axios.post(`${server}/api/v1/users/verify_email`, { token: verifyToken })
                .then(res => {
                    setSuccess(res.data.message || "Email verified successfully! You are now a Verified Member.");
                })
                .catch(err => {
                    setError(err.response?.data?.message || "Email verification failed or token expired.");
                });
        }

        if (resetParam) {
            setResetToken(resetParam);
            setResetStep(2);
            setForgotModalOpen(true);
        }
    }, []);

    // Initialize Google Identity Services (GSI)
    useEffect(() => {
        const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "1028711463124-747vd73q7v6n5vfq96t5ks6d5n5p8m0n.apps.googleusercontent.com";

        const handleGoogleCallback = async (response) => {
            if (response && response.credential) {
                setLoading(true);
                setError("");
                try {
                    await handleGoogleAuth({ credential: response.credential });
                } catch (err) {
                    setError(err.response?.data?.message || "Google authentication failed. Please try again.");
                } finally {
                    setLoading(false);
                }
            }
        };

        const initGsi = () => {
            if (window.google && window.google.accounts && window.google.accounts.id) {
                try {
                    window.google.accounts.id.initialize({
                        client_id: googleClientId,
                        callback: handleGoogleCallback,
                        auto_select: false
                    });

                    const btnEl = document.getElementById("google-login-btn");
                    if (btnEl) {
                        btnEl.innerHTML = "";
                        window.google.accounts.id.renderButton(btnEl, {
                            theme: mode === "dark" ? "filled_black" : "outline",
                            size: "large",
                            width: "360",
                            text: tab === 0 ? "signin_with" : "signup_with",
                            shape: "rectangular"
                        });
                    }
                } catch (e) {
                    console.warn("GSI initialization error:", e);
                }
            }
        };

        initGsi();
        const timer = setTimeout(initGsi, 600);
        return () => clearTimeout(timer);
    }, [tab, handleGoogleAuth, mode]);

    // 1. Submit Sign In with Real Email
    const onLogin = async (e) => {
        if (e) e.preventDefault();
        setError("");
        setSuccess("");

        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!loginEmail.trim()) {
            errors.loginEmail = "Email address is required.";
        } else if (!emailRegex.test(loginEmail.trim())) {
            errors.loginEmail = "Please enter a valid email address.";
        }

        if (!loginPassword) {
            errors.loginPassword = "Password is required.";
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setFieldErrors({});
        setLoading(true);
        try {
            await handleLogin(loginEmail.trim(), loginPassword);
        } catch (err) {
            setError(err.response?.data?.message || "Invalid credentials. Please verify your email and password.");
        } finally {
            setLoading(false);
        }
    };

    // 2. Submit Sign Up with Real Email
    const onSignup = async (e) => {
        if (e) e.preventDefault();
        setError("");
        setSuccess("");

        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!name.trim()) {
            errors.name = "Full name is required.";
        } else if (name.trim().length < 2) {
            errors.name = "Full name must be at least 2 characters.";
        }

        if (!signupEmail.trim()) {
            errors.signupEmail = "Email address is required.";
        } else if (!emailRegex.test(signupEmail.trim())) {
            errors.signupEmail = "Please enter a valid email address (e.g. name@gmail.com).";
        }

        if (!signupPassword) {
            errors.signupPassword = "Password is required.";
        } else if (signupPassword.length < 6) {
            errors.signupPassword = "Password must be at least 6 characters.";
        }

        if (!confirmPassword) {
            errors.confirmPassword = "Please confirm your password.";
        } else if (signupPassword !== confirmPassword) {
            errors.confirmPassword = "Passwords do not match.";
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setFieldErrors({});
        setLoading(true);
        try {
            const msg = await handleRegister({
                name: name.trim(),
                email: signupEmail.trim().toLowerCase(),
                password: signupPassword
            });
            setSuccess(msg || "Account created successfully! Please sign in with your email.");
            setTab(0);
            setLoginEmail(signupEmail.trim());
            setLoginPassword("");
        } catch (err) {
            setError(err.response?.data?.message || "Registration failed. This email might already be registered.");
        } finally {
            setLoading(false);
        }
    };

    // Request reset token
    const handleSendResetToken = async () => {
        setForgotError("");
        setForgotMsg("");
        if (!forgotEmail || !forgotEmail.trim()) {
            setForgotError("Please enter your registered email address.");
            return;
        }

        setForgotLoading(true);
        try {
            const res = await axios.post(`${server}/api/v1/users/forgot_password`, { email: forgotEmail.trim() });
            setForgotMsg(res.data.message || "Reset token generated! Check your email or use the token provided.");
            if (res.data.resetToken) {
                setResetToken(res.data.resetToken);
            }
            setResetStep(2);
        } catch (err) {
            setForgotError(err.response?.data?.message || "Could not generate reset token. Check email.");
        } finally {
            setForgotLoading(false);
        }
    };

    // Submit new password with reset token
    const handleResetPassword = async () => {
        setForgotError("");
        setForgotMsg("");
        if (!resetToken.trim() || !newPassword) {
            setForgotError("Please provide both reset token and your new password.");
            return;
        }
        if (newPassword.length < 6) {
            setForgotError("New password must be at least 6 characters.");
            return;
        }

        setForgotLoading(true);
        try {
            const res = await axios.post(`${server}/api/v1/users/reset_password`, {
                token: resetToken.trim(),
                newPassword
            });
            setSuccess(res.data.message || "Password reset successful! Please sign in with your new password.");
            setForgotModalOpen(false);
            setLoginPassword("");
            setResetStep(1);
        } catch (err) {
            setForgotError(err.response?.data?.message || "Failed to reset password. Token may be invalid or expired.");
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "background.default",
                padding: { xs: 2.5, sm: 4 },
                position: "relative"
            }}
        >
            {/* Theme Toggle in top-right */}
            <Box sx={{ position: "absolute", top: 16, right: 16 }}>
                <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                    <IconButton
                        onClick={toggleTheme}
                        aria-label="Toggle light/dark theme"
                        sx={{
                            color: "text.secondary",
                            border: 1,
                            borderColor: "divider",
                            bgcolor: "background.paper",
                            "&:hover": { color: "primary.main", borderColor: "primary.main" }
                        }}
                    >
                        {mode === "dark" ? <LightModeIcon sx={{ fontSize: 20 }} /> : <DarkModeIcon sx={{ fontSize: 20 }} />}
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Header Brand */}
            <Box
                onClick={() => navigate("/")}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.2,
                    cursor: "pointer",
                    mb: 3,
                    userSelect: "none"
                }}
            >
                <Box
                    component="img"
                    src="/video.svg"
                    alt="LiveLink Logo"
                    sx={{ width: 42, height: 42 }}
                />
                <Typography variant="h4" sx={{ fontWeight: 800, color: "text.primary", letterSpacing: "-0.5px" }}>
                    Live<span style={{ color: "#2563eb" }}>Link</span>
                </Typography>
            </Box>

            {/* Auth Card */}
            <Paper
                elevation={0}
                sx={{
                    width: "100%",
                    maxWidth: 440,
                    borderRadius: "20px",
                    border: 1,
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    p: { xs: 3, sm: 4 },
                    boxShadow: mode === "dark" ? "0 8px 30px rgba(0, 0, 0, 0.4)" : "0 8px 30px rgba(0, 0, 0, 0.04)"
                }}
            >
                {/* Tabs */}
                <Tabs
                    value={tab}
                    onChange={(_, val) => {
                        setTab(val);
                        setError("");
                        setSuccess("");
                        setFieldErrors({});
                    }}
                    variant="fullWidth"
                    sx={{
                        mb: 3,
                        borderBottom: 1,
                        borderColor: "divider",
                        "& .MuiTabs-indicator": {
                            backgroundColor: "#2563eb",
                            height: 3,
                            borderRadius: "3px 3px 0 0"
                        }
                    }}
                >
                    <Tab
                        label="Sign In"
                        sx={{
                            fontWeight: 700,
                            fontSize: "0.98rem",
                            textTransform: "none",
                            color: tab === 0 ? "#2563eb !important" : "text.secondary"
                        }}
                    />
                    <Tab
                        label="Register"
                        sx={{
                            fontWeight: 700,
                            fontSize: "0.98rem",
                            textTransform: "none",
                            color: tab === 1 ? "#2563eb !important" : "text.secondary"
                        }}
                    />
                </Tabs>

                {/* Alerts */}
                {error && (
                    <Alert severity="error" sx={{ mb: 2.5, borderRadius: "10px", fontSize: "0.88rem" }} onClose={() => setError("")}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 2.5, borderRadius: "10px", fontSize: "0.88rem" }} onClose={() => setSuccess("")}>
                        {success}
                    </Alert>
                )}

                {/* Google Button on Top */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        minHeight: 44,
                        mb: 1
                    }}
                >
                    <div id="google-login-btn"></div>
                </Box>

                {/* "OR" Divider */}
                <Box sx={{ display: "flex", alignItems: "center", my: 2.5 }}>
                    <Divider sx={{ flexGrow: 1, borderColor: "divider" }} />
                    <Typography variant="caption" sx={{ px: 1.5, color: "text.secondary", fontWeight: 700, letterSpacing: "0.5px" }}>
                        OR
                    </Typography>
                    <Divider sx={{ flexGrow: 1, borderColor: "divider" }} />
                </Box>

                {/* =========================================================================
                    1. SIGN IN WITH EMAIL & PASSWORD
                    ========================================================================= */}
                {tab === 0 && (
                    <Box component="form" onSubmit={onLogin} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Email Address"
                            type="email"
                            placeholder="e.g. yourname@gmail.com"
                            value={loginEmail}
                            onChange={(e) => {
                                setLoginEmail(e.target.value);
                                clearFieldError("loginEmail");
                            }}
                            error={Boolean(fieldErrors.loginEmail)}
                            helperText={fieldErrors.loginEmail}
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: "10px" }
                            }}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={loginPassword}
                            onChange={(e) => {
                                setLoginPassword(e.target.value);
                                clearFieldError("loginPassword");
                            }}
                            error={Boolean(fieldErrors.loginPassword)}
                            helperText={fieldErrors.loginPassword}
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            size="small"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: "10px" }
                            }}
                        />

                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: -1 }}>
                            <Button
                                size="small"
                                onClick={() => {
                                    setForgotEmail(loginEmail);
                                    setForgotError("");
                                    setForgotMsg("");
                                    setResetStep(1);
                                    setForgotModalOpen(true);
                                }}
                                sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.85rem", color: "primary.main", p: 0 }}
                            >
                                Forgot password?
                            </Button>
                        </Box>

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={loading}
                            sx={{
                                py: 1.3,
                                mt: 0.5,
                                backgroundColor: "#2563eb",
                                color: "#ffffff",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                borderRadius: "10px",
                                textTransform: "none",
                                boxShadow: "none",
                                "&:hover": { backgroundColor: "#1d4ed8" }
                            }}
                        >
                            {loading ? <CircularProgress size={20} color="inherit" /> : "Sign In with Email"}
                        </Button>

                        <Box sx={{ textAlign: "center", mt: 1 }}>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                Don't have an account?{" "}
                                <span
                                    onClick={() => {
                                        setTab(1);
                                        setError("");
                                        setSuccess("");
                                        setFieldErrors({});
                                    }}
                                    style={{ color: "#2563eb", fontWeight: 700, cursor: "pointer" }}
                                >
                                    Register here
                                </span>
                            </Typography>
                        </Box>
                    </Box>
                )}

                {/* =========================================================================
                    2. SIGN UP WITH EMAIL & PASSWORD
                    ========================================================================= */}
                {tab === 1 && (
                    <Box component="form" onSubmit={onSignup} noValidate sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Full Name"
                            placeholder="e.g. Alex Johnson"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                clearFieldError("name");
                            }}
                            error={Boolean(fieldErrors.name)}
                            helperText={fieldErrors.name}
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <BadgeIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: "10px" }
                            }}
                        />

                        <TextField
                            fullWidth
                            size="small"
                            label="Email Address"
                            type="email"
                            placeholder="e.g. yourname@gmail.com"
                            value={signupEmail}
                            onChange={(e) => {
                                setSignupEmail(e.target.value);
                                clearFieldError("signupEmail");
                            }}
                            error={Boolean(fieldErrors.signupEmail)}
                            helperText={fieldErrors.signupEmail}
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                                    </InputAdornment>
                                ),
                                sx: { borderRadius: "10px" }
                            }}
                        />

                        <Box>
                            <TextField
                                fullWidth
                                size="small"
                                label="Create Password"
                                type={showPassword ? "text" : "password"}
                                placeholder="At least 6 characters"
                                value={signupPassword}
                                onChange={(e) => {
                                    setSignupPassword(e.target.value);
                                    clearFieldError("signupPassword");
                                    if (confirmPassword && e.target.value !== confirmPassword) {
                                        setFieldErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match." }));
                                    } else if (confirmPassword && e.target.value === confirmPassword) {
                                        clearFieldError("confirmPassword");
                                    }
                                }}
                                error={Boolean(fieldErrors.signupPassword)}
                                helperText={fieldErrors.signupPassword}
                                required
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                                        </InputAdornment>
                                    ),
                                    sx: { borderRadius: "10px" }
                                }}
                            />

                            {/* Password Strength Meter */}
                            {signupPassword && (
                                <Box sx={{ mt: 1, mb: 0.5, px: 0.5 }}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", fontWeight: 600 }}>
                                            Password Strength:
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: signupStrength.color, fontSize: "0.75rem" }}>
                                            {signupStrength.label}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: "flex", gap: 0.8 }}>
                                        {[1, 2, 3, 4].map((step) => (
                                            <Box
                                                key={step}
                                                sx={{
                                                    flexGrow: 1,
                                                    height: 4,
                                                    borderRadius: "2px",
                                                    bgcolor: signupStrength.score >= step ? signupStrength.color : (mode === "dark" ? "#1f2937" : "#e2e8f0"),
                                                    transition: "background-color 0.2s ease"
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </Box>

                        <TextField
                            fullWidth
                            size="small"
                            label="Confirm Password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Re-enter password"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (signupPassword && e.target.value !== signupPassword) {
                                    setFieldErrors((prev) => ({ ...prev, confirmPassword: "Passwords do not match." }));
                                } else {
                                    clearFieldError("confirmPassword");
                                }
                            }}
                            required
                            error={Boolean(fieldErrors.confirmPassword)}
                            helperText={fieldErrors.confirmPassword}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: confirmPassword && signupPassword === confirmPassword ? (
                                    <InputAdornment position="end">
                                        <CheckCircleIcon sx={{ color: "#16a34a", fontSize: 18 }} />
                                    </InputAdornment>
                                ) : null,
                                sx: { borderRadius: "10px" }
                            }}
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={loading}
                            sx={{
                                py: 1.3,
                                mt: 0.5,
                                backgroundColor: "#2563eb",
                                color: "#ffffff",
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                borderRadius: "10px",
                                textTransform: "none",
                                boxShadow: "none",
                                "&:hover": { backgroundColor: "#1d4ed8" }
                            }}
                        >
                            {loading ? <CircularProgress size={20} color="inherit" /> : "Create Free Account"}
                        </Button>

                        <Box sx={{ textAlign: "center", mt: 1 }}>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                Already registered?{" "}
                                <span
                                    onClick={() => {
                                        setTab(0);
                                        setError("");
                                        setSuccess("");
                                        setFieldErrors({});
                                    }}
                                    style={{ color: "#2563eb", fontWeight: 700, cursor: "pointer" }}
                                >
                                    Sign In here
                                </span>
                            </Typography>
                        </Box>
                    </Box>
                )}

                {/* Secure Room Code Guest access link */}
                <Box sx={{ textAlign: "center", mt: 3, pt: 2, borderTop: 1, borderColor: "divider" }}>
                    <Button
                        onClick={() => {
                            const guestCode = generateRoomCode();
                            navigate(`/${guestCode}`);
                        }}
                        variant="text"
                        size="small"
                        sx={{
                            color: "text.secondary",
                            textTransform: "none",
                            fontSize: "0.86rem",
                            fontWeight: 600,
                            "&:hover": { color: "primary.main" }
                        }}
                    >
                        Want to test without an account? Join as Guest →
                    </Button>
                </Box>
            </Paper>

            {/* Forgot / Reset Password Dialog */}
            <Dialog
                open={forgotModalOpen}
                onClose={() => setForgotModalOpen(false)}
                PaperProps={{ sx: { borderRadius: "20px", p: 1, maxWidth: 440, width: "100%", bgcolor: "background.paper", borderColor: "divider" } }}
            >
                <DialogTitle sx={{ fontWeight: 800, pb: 1, color: "text.primary" }}>
                    {resetStep === 1 ? "Forgot Password" : "Reset Your Password"}
                </DialogTitle>
                <DialogContent>
                    {forgotError && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: "10px", fontSize: "0.86rem" }}>
                            {forgotError}
                        </Alert>
                    )}
                    {forgotMsg && (
                        <Alert severity="success" sx={{ mb: 2, borderRadius: "10px", fontSize: "0.86rem" }}>
                            {forgotMsg}
                        </Alert>
                    )}

                    {resetStep === 1 ? (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                Enter your registered email address. We will generate a secure reset token for your account.
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                label="Registered Email"
                                type="email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                InputProps={{ sx: { borderRadius: "10px" } }}
                            />
                        </Box>
                    ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                Enter the reset token and choose a new password (min. 6 characters).
                            </Typography>
                            <TextField
                                fullWidth
                                size="small"
                                label="Reset Token"
                                value={resetToken}
                                onChange={(e) => setResetToken(e.target.value)}
                                InputProps={{ sx: { borderRadius: "10px" } }}
                            />
                            <Box>
                                <TextField
                                    fullWidth
                                    size="small"
                                    type="password"
                                    label="New Password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    InputProps={{ sx: { borderRadius: "10px" } }}
                                />
                                {newPassword && (
                                    <Box sx={{ mt: 1, px: 0.5 }}>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", fontWeight: 600 }}>
                                                Password Strength:
                                            </Typography>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: resetStrength.color, fontSize: "0.75rem" }}>
                                                {resetStrength.label}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: "flex", gap: 0.8 }}>
                                            {[1, 2, 3, 4].map((step) => (
                                                <Box
                                                    key={step}
                                                    sx={{
                                                        flexGrow: 1,
                                                        height: 4,
                                                        borderRadius: "2px",
                                                        bgcolor: resetStrength.score >= step ? resetStrength.color : (mode === "dark" ? "#1f2937" : "#e2e8f0"),
                                                        transition: "background-color 0.2s ease"
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, display: "flex", justifyContent: "space-between" }}>
                    <Button onClick={() => setForgotModalOpen(false)} sx={{ color: "text.secondary", textTransform: "none", fontWeight: 600 }}>
                        Cancel
                    </Button>
                    {resetStep === 1 ? (
                        <Button
                            variant="contained"
                            onClick={handleSendResetToken}
                            disabled={forgotLoading}
                            sx={{
                                backgroundColor: "#2563eb",
                                fontWeight: 700,
                                textTransform: "none",
                                borderRadius: "10px",
                                px: 2.5,
                                "&:hover": { backgroundColor: "#1d4ed8" }
                            }}
                        >
                            {forgotLoading ? "Sending..." : "Send Reset Token"}
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            onClick={handleResetPassword}
                            disabled={forgotLoading}
                            sx={{
                                backgroundColor: "#2563eb",
                                fontWeight: 700,
                                textTransform: "none",
                                borderRadius: "10px",
                                px: 2.5,
                                "&:hover": { backgroundColor: "#1d4ed8" }
                            }}
                        >
                            {forgotLoading ? "Updating..." : "Update Password"}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}