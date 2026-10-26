import React from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useThemeMode } from "../../contexts/ThemeContext";

/**
 * Strict Design System Toast / Snackbar Component
 * - 4 types: success, error, warning, info
 * - Auto-dismiss 4s
 * - Manual close button
 * - No emojis (strictly MUI Outlined icons)
 */
export default function AppToast({
  open,
  message,
  severity = "info", // 'success' | 'error' | 'warning' | 'info'
  onClose,
  position = "top-right", // 'top-right' | 'bottom-center'
  autoHideDuration = 4000
}) {
  const { tokens, isDark } = useThemeMode();
  const c = tokens.colors;

  const anchorOrigin =
    position === "bottom-center"
      ? { vertical: "bottom", horizontal: "center" }
      : { vertical: "top", horizontal: "right" };

  const getIcon = () => {
    switch (severity) {
      case "success":
        return <CheckCircleOutlineOutlinedIcon sx={{ fontSize: "20px", color: c.success }} />;
      case "error":
        return <ErrorOutlineOutlinedIcon sx={{ fontSize: "20px", color: c.danger }} />;
      case "warning":
        return <WarningAmberOutlinedIcon sx={{ fontSize: "20px", color: c.warningText }} />;
      case "info":
      default:
        return <InfoOutlinedIcon sx={{ fontSize: "20px", color: c.primary }} />;
    }
  };

  const getSeverityStyles = () => {
    switch (severity) {
      case "success":
        return {
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          borderLeft: `4px solid ${c.success}`,
          color: c.textHeading
        };
      case "error":
        return {
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          borderLeft: `4px solid ${c.danger}`,
          color: c.textHeading
        };
      case "warning":
        return {
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          borderLeft: `4px solid ${c.warningText}`,
          color: c.textHeading
        };
      case "info":
      default:
        return {
          backgroundColor: c.surface,
          border: `1px solid ${c.border}`,
          borderLeft: `4px solid ${c.primary}`,
          color: c.textHeading
        };
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      sx={{
        transition: `all ${tokens.motion.toast}`
      }}
    >
      <Alert
        onClose={onClose}
        icon={getIcon()}
        sx={{
          borderRadius: tokens.radii.button,
          boxShadow: isDark ? "0 10px 25px -5px rgba(0,0,0,0.6)" : (c.shadow || "0 10px 25px -5px rgba(0,0,0,0.05)"),
          fontSize: tokens.typography.caption.fontSize,
          fontFamily: tokens.typography.fonts.body,
          fontWeight: 500,
          alignItems: "center",
          ...getSeverityStyles()
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
