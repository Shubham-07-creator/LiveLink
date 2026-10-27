import React from "react";
import Chip from "@mui/material/Chip";
import { useThemeMode } from "../../contexts/ThemeContext";

/**
 * Strict Design System Chip Component
 * - Removable or clickable
 * - 8px padding, 13px text
 * - 999px radius
 */
export default function AppChip({
  label,
  onClick,
  onDelete,
  icon,
  active = false,
  disabled = false,
  sx = {},
  ...props
}) {
  const themeContext = useThemeMode();
  const tokens = themeContext?.tokens || {};
  const isDark = Boolean(themeContext?.isDark);
  const c = tokens?.colors || {};

  const surface = c?.surface || (isDark ? "#111827" : "#ffffff");
  const border = c?.border || (isDark ? "#1f2937" : "#e2e8f0");
  const primary = c?.primary || (isDark ? "#3b82f6" : "#2563eb");
  const textHeading = c?.textHeading || (isDark ? "#f1f5f9" : "#0f172a");
  const textMuted = c?.textMuted || (isDark ? "#94a3b8" : "#64748b");
  const danger = c?.danger || "#dc2626";

  return (
    <Chip
      label={label}
      onClick={onClick}
      onDelete={onDelete}
      icon={icon}
      disabled={disabled}
      sx={{
        borderRadius: tokens?.radii?.badge || "999px",
        fontSize: tokens?.typography?.caption?.fontSize || "13px",
        fontFamily: tokens?.typography?.fonts?.body || "Inter, sans-serif",
        fontWeight: 600,
        height: "32px",
        padding: "0 4px",
        backgroundColor: active ? (c?.primarySoftBg || "#eff6ff") : surface,
        color: active ? primary : textHeading,
        border: `1px solid ${active ? (c?.primarySoftBorder || "#bfdbfe") : border}`,
        transition: `all ${tokens?.motion?.micro || "150ms ease"}`,
        "&:hover": {
          backgroundColor: active ? (c?.primarySoftBg || "#eff6ff") : isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9",
          borderColor: active ? primary : border
        },
        "& .MuiChip-deleteIcon": {
          color: textMuted,
          fontSize: "16px",
          "&:hover": {
            color: danger
          }
        },
        "& .MuiChip-icon": {
          color: active ? primary : textMuted,
          fontSize: "18px"
        },
        ...sx
      }}
      {...props}
    />
  );
}
