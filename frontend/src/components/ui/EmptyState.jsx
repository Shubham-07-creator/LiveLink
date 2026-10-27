import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import { useThemeMode } from "../../contexts/ThemeContext";

/**
 * Strict Design System EmptyState Component
 * - Centered container
 * - 48px muted icon
 * - 18px title (Plus Jakarta Sans, weight 600)
 * - 14px description (Inter, max-width 400px, text muted)
 * - Optional action button slot
 */
export default function AppEmptyState({
  icon,
  title = "Nothing to show",
  description = "No items found. Create or join one to get started.",
  action,
  sx = {}
}) {
  const themeContext = useThemeMode();
  const tokens = themeContext?.tokens || {};
  const isDark = Boolean(themeContext?.isDark);
  const c = tokens?.colors || {};

  const border = c?.border || (isDark ? "#1f2937" : "#e2e8f0");
  const primary = c?.primary || (isDark ? "#3b82f6" : "#2563eb");
  const textHeading = c?.textHeading || (isDark ? "#f1f5f9" : "#0f172a");
  const textMuted = c?.textMuted || (isDark ? "#94a3b8" : "#64748b");
  const primarySoftBg = c?.primarySoftBg || (isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff");

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        borderRadius: tokens?.radii?.card || "20px",
        border: `1px dashed ${border}`,
        backgroundColor: "transparent",
        ...sx
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 72,
          height: 72,
          borderRadius: "50%",
          backgroundColor: primarySoftBg,
          color: textMuted,
          mb: 2,
          "& .MuiSvgIcon-root": {
            fontSize: "40px",
            color: primary
          }
        }}
      >
        {icon || <InboxOutlinedIcon />}
      </Box>

      <Typography
        variant="h5"
        sx={{
          fontFamily: tokens?.typography?.fonts?.heading || "Plus Jakarta Sans, sans-serif",
          fontWeight: tokens?.typography?.cardTitle?.weight || 600,
          fontSize: tokens?.typography?.cardTitle?.fontSize || "18px",
          color: textHeading,
          mb: 1
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          sx={{
            fontFamily: tokens?.typography?.fonts?.body || "Inter, sans-serif",
            fontSize: "14px",
            color: textMuted,
            maxWidth: "400px",
            mb: action ? 3 : 0,
            lineHeight: 1.5
          }}
        >
          {description}
        </Typography>
      )}

      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  );
}
