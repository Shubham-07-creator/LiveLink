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
  const themeContext = useThemeMode();
  const tokens = themeContext?.tokens || {};
  const isDark = Boolean(themeContext?.isDark);
  const c = tokens?.colors || {};

  const anchorOrigin =
    position === "bottom-center"
      ? { vertical: "bottom", horizontal: "center" }
      : { vertical: "top", horizontal: "right" };

  const getIcon = () => {
    switch (severity) {
      case "success":
        return <CheckCircleOutlineOutlinedIcon sx={{ fontSize: "20px", color: c?.success || "#15803d" }} />;
      case "error":
        return <ErrorOutlineOutlinedIcon sx={{ fontSize: "20px", color: c?.danger || "#dc2626" }} />;
      case "warning":
        return <WarningAmberOutlinedIcon sx={{ fontSize: "20px", color: c?.warningText || c?.warning || "#b45309" }} />;
      case "info":
      default:
        return <InfoOutlinedIcon sx={{ fontSize: "20px", color: c?.primary || "#2563eb" }} />;
    }
  };

  const getSeverityStyles = () => {
    const surface = c?.surface || (isDark ? "#111827" : "#ffffff");
    const border = c?.border || (isDark ? "#1f2937" : "#e2e8f0");
    const textHeading = c?.textHeading || (isDark ? "#f1f5f9" : "#0f172a");

    switch (severity) {
      case "success":
        return {
          backgroundColor: surface,
          border: `1px solid ${border}`,
          borderLeft: `4px solid ${c?.success || "#15803d"}`,
          color: textHeading
        };
      case "error":
        return {
          backgroundColor: surface,
          border: `1px solid ${border}`,
          borderLeft: `4px solid ${c?.danger || "#dc2626"}`,
          color: textHeading
        };
      case "warning":
        return {
          backgroundColor: surface,
          border: `1px solid ${border}`,
          borderLeft: `4px solid ${c?.warningText || c?.warning || "#b45309"}`,
          color: textHeading
        };
      case "info":
      default:
        return {
          backgroundColor: surface,
          border: `1px solid ${border}`,
          borderLeft: `4px solid ${c?.primary || "#2563eb"}`,
          color: textHeading
        };
    }
  };

  const transitionDuration = tokens?.motion?.toast || "200ms ease-out";
  const buttonRadius = tokens?.radii?.button || "12px";
  const shadowValue = isDark
    ? "0 10px 25px -5px rgba(0,0,0,0.6)"
    : (c?.shadow || tokens?.colors?.light?.shadow || "0 10px 25px -5px rgba(0,0,0,0.05)");

  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      sx={{
        transition: `all ${transitionDuration}`
      }}
    >
      <Alert
        onClose={onClose}
        icon={getIcon()}
        sx={{
          borderRadius: buttonRadius,
          boxShadow: shadowValue,
          fontSize: tokens?.typography?.caption?.fontSize || "13px",
          fontFamily: tokens?.typography?.fonts?.body || "Inter, sans-serif",
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
