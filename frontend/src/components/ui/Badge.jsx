import React from "react";
import Box from "@mui/material/Box";
import { useThemeMode } from "../../contexts/ThemeContext";

/**
 * Strict Design System Badge Component
 * - 999px pill
 * - 13px text
 * - Soft bg + text matching status
 */
export default function AppBadge({
  children,
  variant = "neutral", // 'primary' | 'success' | 'danger' | 'warning' | 'neutral'
  dot = false,
  icon,
  sx = {}
}) {
  const themeContext = useThemeMode();
  const tokens = themeContext?.tokens || {};
  const isDark = Boolean(themeContext?.isDark);
  const c = tokens?.colors || {};

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: c?.primarySoftBg || (isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff"),
          color: c?.primary || (isDark ? "#3b82f6" : "#2563eb"),
          dotColor: c?.primary || (isDark ? "#3b82f6" : "#2563eb")
        };
      case "success":
        return {
          backgroundColor: c?.successSoftBg || (isDark ? "rgba(21, 128, 61, 0.15)" : "#dcfce7"),
          color: c?.success || "#15803d",
          dotColor: tokens?.accent?.dotGreen || "#16a34a"
        };
      case "danger":
        return {
          backgroundColor: c?.dangerSoftBg || (isDark ? "rgba(220, 38, 38, 0.15)" : "#fee2e2"),
          color: c?.danger || "#dc2626",
          dotColor: tokens?.accent?.dotRed || "#ef4444"
        };
      case "warning":
        return {
          backgroundColor: c?.warningSoftBg || (isDark ? "rgba(245, 158, 11, 0.15)" : "#fef3c7"),
          color: c?.warningText || c?.warning || "#b45309",
          dotColor: tokens?.accent?.dotAmber || "#f59e0b"
        };
      case "neutral":
      default:
        return {
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9",
          color: c?.textMuted || (isDark ? "#94a3b8" : "#64748b"),
          dotColor: c?.textMuted || (isDark ? "#94a3b8" : "#64748b")
        };
    }
  };

  const style = getVariantStyles();

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        borderRadius: tokens?.radii?.badge || "999px",
        padding: "3px 10px",
        fontSize: tokens?.typography?.caption?.fontSize || "13px",
        fontFamily: tokens?.typography?.fonts?.body || "Inter, sans-serif",
        fontWeight: 600,
        lineHeight: 1.2,
        backgroundColor: style.backgroundColor,
        color: style.color,
        letterSpacing: "0.01em",
        ...sx
      }}
    >
      {dot && (
        <Box
          component="span"
          sx={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: style.dotColor,
            flexShrink: 0
          }}
        />
      )}
      {icon && (
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center", fontSize: "14px" }}>
          {icon}
        </Box>
      )}
      {children}
    </Box>
  );
}
