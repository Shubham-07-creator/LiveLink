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
  const { tokens, isDark } = useThemeMode();
  const c = tokens.colors;

  return (
    <Chip
      label={label}
      onClick={onClick}
      onDelete={onDelete}
      icon={icon}
      disabled={disabled}
      sx={{
        borderRadius: tokens.radii.badge,
        fontSize: tokens.typography.caption.fontSize,
        fontFamily: tokens.typography.fonts.body,
        fontWeight: 600,
        height: "32px",
        padding: "0 4px",
        backgroundColor: active ? c.primarySoftBg : c.surface,
        color: active ? c.primary : c.textHeading,
        border: `1px solid ${active ? c.primarySoftBorder : c.border}`,
        transition: `all ${tokens.motion.micro}`,
        "&:hover": {
          backgroundColor: active ? c.primarySoftBg : isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9",
          borderColor: active ? c.primary : c.border
        },
        "& .MuiChip-deleteIcon": {
          color: c.textMuted,
          fontSize: "16px",
          "&:hover": {
            color: c.danger
          }
        },
        "& .MuiChip-icon": {
          color: active ? c.primary : c.textMuted,
          fontSize: "18px"
        },
        ...sx
      }}
      {...props}
    />
  );
}
