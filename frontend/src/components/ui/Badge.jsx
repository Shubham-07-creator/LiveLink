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
  const { tokens, isDark } = useThemeMode();
  const c = tokens.colors;

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: c.primarySoftBg,
          color: c.primary,
          dotColor: c.primary
        };
      case "success":
        return {
          backgroundColor: c.successSoftBg,
          color: c.success,
          dotColor: tokens.accent.dotGreen
        };
      case "danger":
        return {
          backgroundColor: c.dangerSoftBg,
          color: c.danger,
          dotColor: tokens.accent.dotRed
        };
      case "warning":
        return {
          backgroundColor: c.warningSoftBg,
          color: c.warningText,
          dotColor: tokens.accent.dotAmber
        };
      case "neutral":
      default:
        return {
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9",
          color: c.textMuted,
          dotColor: c.textMuted
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
        borderRadius: tokens.radii.badge,
        padding: "3px 10px",
        fontSize: tokens.typography.caption.fontSize,
        fontFamily: tokens.typography.fonts.body,
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
