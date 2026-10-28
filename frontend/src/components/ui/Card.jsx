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
  const themeContext = useThemeMode();
  const tokens = themeContext?.tokens || {};
  const isDark = Boolean(themeContext?.isDark);
  const c = tokens?.colors || {};

  return (
    <Paper
      onClick={onClick}
      sx={{
        borderRadius: tokens?.radii?.card || "20px",
        border: `1px solid ${c?.border || (isDark ? "#1f2937" : "#e2e8f0")}`,
        backgroundColor: c?.surface || (isDark ? "#111827" : "#ffffff"),
        backgroundImage: "none",
        boxShadow: c?.cardShadow || "none",
        padding: typeof padding === "number" ? `${padding * 8}px` : padding,
        cursor: onClick ? "pointer" : "default",
        transition: `transform ${tokens?.motion?.micro || "150ms ease"}, box-shadow ${tokens?.motion?.micro || "150ms ease"}, border-color ${tokens?.motion?.micro || "150ms ease"}, background-color ${tokens?.motion?.micro || "150ms ease"}`,
        ...(hoverLift && {
          "&:hover": {
            transform: "translateY(-2px)",
            borderColor: isDark ? (c?.primaryHover || "#60a5fa") : (c?.primary || "#2563eb"),
            boxShadow: isDark
              ? "0 12px 30px -5px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(96, 165, 250, 0.3)"
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
