import React from "react";
import Paper from "@mui/material/Paper";
import { useThemeMode } from "../../contexts/ThemeContext";

/**
 * Strict Design System Card Component
 * - 20px radius
 * - 1px border (#e2e8f0 / #1f2937)
 * - Soft shadow in light mode, 1px border only in dark mode
 * - Optional hoverLift: translateY(-2px)
 */
export default function AppCard({
  children,
  hoverLift = false,
  padding = 3, // theme.spacing(3) = 24px
  onClick,
  sx = {},
  ...props
}) {
  const { tokens, isDark } = useThemeMode();
  const c = tokens.colors;

  return (
    <Paper
      onClick={onClick}
      sx={{
        borderRadius: tokens.radii.card,
        border: `1px solid ${c.border}`,
        backgroundColor: c.surface,
        backgroundImage: "none",
        boxShadow: c.cardShadow,
        padding: typeof padding === "number" ? `${padding * 8}px` : padding,
        cursor: onClick ? "pointer" : "default",
        transition: `transform ${tokens.motion.micro}, box-shadow ${tokens.motion.micro}, border-color ${tokens.motion.micro}, background-color ${tokens.motion.micro}`,
        ...(hoverLift && {
          "&:hover": {
            transform: "translateY(-2px)",
            borderColor: isDark ? c.primaryHover : c.border,
            boxShadow: isDark
              ? "none"
              : "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)"
          }
        }),
        ...sx
      }}
      {...props}
    >
      {children}
    </Paper>
  );
}
