import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import server from "../environment";
import { AuthContext } from "../contexts/AuthContext";
import { useThemeMode } from "../contexts/ThemeContext";
import { generateRoomCode } from "../utils/roomCode";
import {
  Button,
  IconButton,
  Card,
  Input,
  Modal,
  Toast
} from "../components/ui";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";

import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import MailOutlineOutlinedIcon from "@mui/icons-material/MailOutlineOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";

export default function Authentication() {
  const [tab, setTab] = useState(0); // 0 = Sign In, 1 = Create Account
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Sign In fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sign Up fields
  const [name, setName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Forgot / Reset Password state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotError, setForgotError] = useState("");

  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  const navigate = useNavigate();
  const { handleLogin, handleRegister, handleGoogleAuth } = useContext(AuthContext);
  const themeContext = useThemeMode();
  const isDark = Boolean(themeContext?.isDark);
  const tokens = themeContext?.tokens || {};
  const toggleTheme = themeContext?.toggleTheme;
  const c = tokens?.colors || {};

  const showToast = (message, severity = "info") => {
    setToast({ open: true, message, severity });
  };

  // Password strength evaluator (red -> amber -> blue -> green)
  const evaluatePasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: "", color: c.border };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass) || (/[A-Z]/.test(pass) && /[a-z]/.test(pass))) score += 1;

    if (pass.length < 6) return { score: 1, label: "Too short (min 6 chars)", color: c.danger };
    if (score <= 1) return { score: 1, label: "Weak", color: c.danger };
    if (score === 2) return { score: 2, label: "Fair", color: tokens.accent.dotAmber };
    if (score === 3) return { score: 3, label: "Good", color: c.primary };
    return { score: 4, label: "Strong", color: c.success };
  };

  const signupStrength = evaluatePasswordStrength(signupPassword);
  const resetStrength = evaluatePasswordStrength(newPassword);

  const clearFieldError = (fieldName) => {
    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  };

  // Auto verify email or prefill reset token from URL
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const verifyToken = queryParams.get("verify_token") || queryParams.get("token");
    const resetParam = queryParams.get("reset_token");

    if (verifyToken && (window.location.pathname.includes("verify") || queryParams.get("action") === "verify")) {
      axios.post(`${server}/api/v1/users/verify_email`, { token: verifyToken })
        .then((res) => {
          setSuccess(res.data.message || "Email verified successfully! You are now a verified member.");
        })
        .catch((err) => {
          setError(err.response?.data?.message || "Email verification failed or token expired.");
        });
    }

    if (resetParam) {
      setResetToken(resetParam);
      setResetStep(2);
      setForgotModalOpen(true);
    }
  }, []);

  // Initialize Google Identity Services
  useEffect(() => {
    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "968910378805-07msgdo5roiq6ko7em1mk8g237lebq6r.apps.googleusercontent.com";

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
              theme: isDark ? "filled_black" : "outline",
              size: "large",
              width: "360",
              text: "continue_with",
              shape: "rectangular"
            });
          }
        } catch (e) {
          console.warn("GSI initialization error:", e);
        }
      }
    };

    initGsi();
    const timer = setTimeout(initGsi, 500);
    return () => clearTimeout(timer);
  }, [tab, handleGoogleAuth, isDark]);

  // Submit Sign In
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

  // Submit Sign Up
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
      errors.signupEmail = "Please enter a valid email address.";
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

  // Submit new password
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
      showToast(res.data.message || "Password reset successful! Please sign in with your new password.", "success");
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
        bgcolor: c.bg,
        color: c.textHeading,
        p: { xs: 2.5, sm: 4 },
        position: "relative"
      }}
    >
      {/* Theme Toggle in top-right */}
      <Box sx={{ position: "absolute", top: 16, right: 16 }}>
        <IconButton
          tooltip={isDark ? "Switch to light mode" : "Switch to dark mode"}
          variant="default"
          size="normal"
          onClick={toggleTheme}
          ariaLabel="Toggle theme"
        >
          {isDark ? (
            <LightModeOutlinedIcon sx={{ color: tokens.accent.dotAmber }} />
          ) : (
            <DarkModeOutlinedIcon sx={{ color: c.textMuted }} />
          )}
        </IconButton>
      </Box>

      {/* Brand Header */}
      <Box
        onClick={() => navigate("/")}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          cursor: "pointer",
          mb: 3,
          userSelect: "none"
        }}
      >
        <Box
          component="img"
          src="/video.svg"
          alt="LiveLink"
          sx={{ width: 40, height: 40 }}
        />
        <Typography
          variant="h4"
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

      {/* Auth Card: 420px max-width, 20px radius */}
      <Card
        sx={{
          width: "100%",
          maxWidth: 420,
          p: { xs: 3, sm: 4 }
        }}
      >
        {/* Single H1 per page */}
        <Typography
          component="h1"
          sx={{
            fontFamily: tokens.typography.fonts.heading,
            fontWeight: tokens.typography.pageTitle.weight,
            fontSize: "24px",
            color: c.textHeading,
            textAlign: "center",
            mb: 1
          }}
        >
          {tab === 0 ? "Sign in to LiveLink" : "Create your account"}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: c.textMuted,
            textAlign: "center",
            mb: 3,
            fontSize: tokens.typography.caption.fontSize
          }}
        >
          {tab === 0
            ? "Welcome back. Enter your details to continue."
            : "Get started with free peer-to-peer video calling."}
        </Typography>

        {/* Pill Toggle for Sign in / Register */}
        <Box
          sx={{
            display: "flex",
            p: 0.5,
            mb: 3,
            borderRadius: tokens.radii.button,
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
            border: `1px solid ${c.border}`
          }}
        >
          <Box
            onClick={() => {
              setTab(0);
              setError("");
              setSuccess("");
              setFieldErrors({});
            }}
            sx={{
              flex: 1,
              py: 1,
              textAlign: "center",
              cursor: "pointer",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: tokens.typography.caption.fontSize,
              fontFamily: tokens.typography.fonts.body,
              color: tab === 0 ? c.textHeading : c.textMuted,
              backgroundColor: tab === 0 ? c.surface : "transparent",
              boxShadow: tab === 0 ? (isDark ? "none" : "0 1px 3px rgba(0,0,0,0.08)") : "none",
              transition: `all ${tokens.motion.micro}`
            }}
          >
            Sign in
          </Box>
          <Box
            onClick={() => {
              setTab(1);
              setError("");
              setSuccess("");
              setFieldErrors({});
            }}
            sx={{
              flex: 1,
              py: 1,
              textAlign: "center",
              cursor: "pointer",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: tokens.typography.caption.fontSize,
              fontFamily: tokens.typography.fonts.body,
              color: tab === 1 ? c.textHeading : c.textMuted,
              backgroundColor: tab === 1 ? c.surface : "transparent",
              boxShadow: tab === 1 ? (isDark ? "none" : "0 1px 3px rgba(0,0,0,0.08)") : "none",
              transition: `all ${tokens.motion.micro}`
            }}
          >
            Register
          </Box>
        </Box>

        {/* Inline Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: tokens.radii.button, fontSize: "13px" }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2.5, borderRadius: tokens.radii.button, fontSize: "13px" }} onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        {/* Google Button on Top */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            minHeight: tokens.buttonHeights.large,
            mb: 1
          }}
        >
          <div id="google-login-btn" style={{ width: "100%", display: "flex", justifyContent: "center" }}></div>
        </Box>

        {/* OR Divider */}
        <Box sx={{ display: "flex", alignItems: "center", my: 2.5 }}>
          <Divider sx={{ flexGrow: 1, borderColor: c.border }} />
          <Typography
            variant="caption"
            sx={{
              px: 1.5,
              color: c.textMuted,
              fontWeight: 700,
              letterSpacing: "0.5px"
            }}
          >
            OR
          </Typography>
          <Divider sx={{ flexGrow: 1, borderColor: c.border }} />
        </Box>

        {/* 1. Sign In Form */}
        {tab === 0 && (
          <Box component="form" onSubmit={onLogin} noValidate sx={{ display: "flex", flexDirection: "column" }}>
            <Input
              label="Email address"
              type="email"
              placeholder="e.g. yourname@gmail.com"
              value={loginEmail}
              onChange={(e) => {
                setLoginEmail(e.target.value);
                clearFieldError("loginEmail");
              }}
              error={fieldErrors.loginEmail}
              required
              prefixIcon={<MailOutlineOutlinedIcon sx={{ fontSize: "18px" }} />}
            />

            <Box sx={{ position: "relative" }}>
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  clearFieldError("loginPassword");
                }}
                error={fieldErrors.loginPassword}
                required
                prefixIcon={<LockOutlinedIcon sx={{ fontSize: "18px" }} />}
                suffixIcon={
                  <IconButton
                    tooltip={showPassword ? "Hide password" : "Show password"}
                    variant="ghost"
                    size="small"
                    onClick={() => setShowPassword(!showPassword)}
                    ariaLabel={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <VisibilityOffOutlinedIcon sx={{ fontSize: "18px" }} /> : <VisibilityOutlinedIcon sx={{ fontSize: "18px" }} />}
                  </IconButton>
                }
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: -1, mb: 2 }}>
              <Box
                component="button"
                type="button"
                onClick={() => {
                  setForgotEmail(loginEmail);
                  setForgotError("");
                  setForgotMsg("");
                  setResetStep(1);
                  setForgotModalOpen(true);
                }}
                sx={{
                  background: "none",
                  border: "none",
                  p: 0,
                  cursor: "pointer",
                  color: c.primary,
                  fontWeight: 600,
                  fontSize: tokens.typography.caption.fontSize,
                  fontFamily: tokens.typography.fonts.body,
                  "&:hover": { textDecoration: "underline" }
                }}
              >
                Forgot password?
              </Box>
            </Box>

            {/* Primary Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              loading={loading}
            >
              Sign in
            </Button>

            {/* Terms Notice */}
            <Typography
              variant="caption"
              sx={{
                textAlign: "center",
                color: c.textMuted,
                mt: 2,
                fontSize: "12px",
                lineHeight: 1.4
              }}
            >
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Typography>

            {/* Bottom Switch Link */}
            <Box sx={{ textAlign: "center", mt: 2.5 }}>
              <Typography variant="body2" sx={{ color: c.textMuted, fontSize: "14px" }}>
                Don't have an account?{" "}
                <Box
                  component="span"
                  onClick={() => {
                    setTab(1);
                    setError("");
                    setSuccess("");
                    setFieldErrors({});
                  }}
                  sx={{ color: c.primary, fontWeight: 600, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                >
                  Sign up
                </Box>
              </Typography>
            </Box>
          </Box>
        )}

        {/* 2. Register Form */}
        {tab === 1 && (
          <Box component="form" onSubmit={onSignup} noValidate sx={{ display: "flex", flexDirection: "column" }}>
            <Input
              label="Full name"
              placeholder="e.g. Alex Johnson"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError("name");
              }}
              error={fieldErrors.name}
              required
              prefixIcon={<PersonOutlineOutlinedIcon sx={{ fontSize: "18px" }} />}
            />

            <Input
              label="Email address"
              type="email"
              placeholder="e.g. yourname@gmail.com"
              value={signupEmail}
              onChange={(e) => {
                setSignupEmail(e.target.value);
                clearFieldError("signupEmail");
              }}
              error={fieldErrors.signupEmail}
              required
              prefixIcon={<MailOutlineOutlinedIcon sx={{ fontSize: "18px" }} />}
            />

            <Box>
              <Input
                label="Create password"
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
                error={fieldErrors.signupPassword}
                required
                prefixIcon={<LockOutlinedIcon sx={{ fontSize: "18px" }} />}
              />

              {/* 4-bar Password Strength Meter (red -> amber -> blue -> green) */}
              {signupPassword && (
                <Box sx={{ mt: -1, mb: 2, px: 0.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: c.textMuted, fontSize: "12px", fontWeight: 500 }}>
                      Password strength:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: signupStrength.color, fontSize: "12px" }}>
                      {signupStrength.label}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {[1, 2, 3, 4].map((step) => (
                      <Box
                        key={step}
                        sx={{
                          flexGrow: 1,
                          height: 4,
                          borderRadius: "2px",
                          bgcolor: signupStrength.score >= step ? signupStrength.color : (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"),
                          transition: `background-color ${tokens.motion.micro}`
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            <Input
              label="Confirm password"
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
              error={fieldErrors.confirmPassword}
              prefixIcon={<LockOutlinedIcon sx={{ fontSize: "18px" }} />}
              suffixIcon={
                confirmPassword && signupPassword === confirmPassword ? (
                  <CheckCircleOutlineOutlinedIcon sx={{ color: c.success, fontSize: "18px" }} />
                ) : null
              }
            />

            {/* Primary Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              loading={loading}
              sx={{ mt: 0.5 }}
            >
              Create account
            </Button>

            {/* Terms Notice */}
            <Typography
              variant="caption"
              sx={{
                textAlign: "center",
                color: c.textMuted,
                mt: 2,
                fontSize: "12px",
                lineHeight: 1.4
              }}
            >
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Typography>

            {/* Bottom Switch Link */}
            <Box sx={{ textAlign: "center", mt: 2.5 }}>
              <Typography variant="body2" sx={{ color: c.textMuted, fontSize: "14px" }}>
                Already have an account?{" "}
                <Box
                  component="span"
                  onClick={() => {
                    setTab(0);
                    setError("");
                    setSuccess("");
                    setFieldErrors({});
                  }}
                  sx={{ color: c.primary, fontWeight: 600, cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                >
                  Sign in
                </Box>
              </Typography>
            </Box>
          </Box>
        )}

        {/* Guest Access Link */}
        <Box sx={{ textAlign: "center", mt: 3, pt: 2, borderTop: `1px solid ${c.border}` }}>
          <Button
            variant="ghost"
            size="small"
            onClick={() => {
              const guestCode = generateRoomCode();
              navigate(`/${guestCode}`);
            }}
          >
            Want to test without an account? Join as guest
          </Button>
        </Box>
      </Card>

      {/* Forgot / Reset Password Modal */}
      <Modal
        open={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        title={resetStep === 1 ? "Forgot password" : "Reset your password"}
        description={
          resetStep === 1
            ? "Enter your registered email address to receive a reset token."
            : "Enter the reset token along with your new password."
        }
        actions={
          <>
            <Button variant="ghost" size="normal" onClick={() => setForgotModalOpen(false)}>
              Cancel
            </Button>
            {resetStep === 1 ? (
              <Button
                variant="primary"
                size="normal"
                onClick={handleSendResetToken}
                loading={forgotLoading}
              >
                Send reset token
              </Button>
            ) : (
              <Button
                variant="primary"
                size="normal"
                onClick={handleResetPassword}
                loading={forgotLoading}
              >
                Update password
              </Button>
            )}
          </>
        }
      >
        {forgotError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: tokens.radii.button, fontSize: "13px" }}>
            {forgotError}
          </Alert>
        )}
        {forgotMsg && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: tokens.radii.button, fontSize: "13px" }}>
            {forgotMsg}
          </Alert>
        )}

        {resetStep === 1 ? (
          <Box sx={{ pt: 1 }}>
            <Input
              label="Registered email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="e.g. yourname@gmail.com"
            />
          </Box>
        ) : (
          <Box sx={{ pt: 1 }}>
            <Input
              label="Reset token"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder="Paste token here"
            />
            <Box>
              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
              {newPassword && (
                <Box sx={{ mt: -1, px: 0.5, mb: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: c.textMuted, fontSize: "12px", fontWeight: 500 }}>
                      Password strength:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: resetStrength.color, fontSize: "12px" }}>
                      {resetStrength.label}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {[1, 2, 3, 4].map((step) => (
                      <Box
                        key={step}
                        sx={{
                          flexGrow: 1,
                          height: 4,
                          borderRadius: "2px",
                          bgcolor: resetStrength.score >= step ? resetStrength.color : (isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"),
                          transition: `background-color ${tokens.motion.micro}`
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}
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
