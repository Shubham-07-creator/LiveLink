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
  const { tokens } = useThemeMode();
  const c = tokens.colors;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 24px",
        borderRadius: tokens.radii.card,
        border: `1px dashed ${c.border}`,
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
          backgroundColor: c.primarySoftBg,
          color: c.textMuted,
          mb: 2,
          "& .MuiSvgIcon-root": {
            fontSize: "40px",
            color: c.primary
          }
        }}
      >
        {icon || <InboxOutlinedIcon />}
      </Box>

      <Typography
        variant="h5"
        sx={{
          fontFamily: tokens.typography.fonts.heading,
          fontWeight: tokens.typography.cardTitle.weight,
          fontSize: tokens.typography.cardTitle.fontSize,
          color: c.textHeading,
          mb: 1
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          sx={{
            fontFamily: tokens.typography.fonts.body,
            fontSize: "14px",
            color: c.textMuted,
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
