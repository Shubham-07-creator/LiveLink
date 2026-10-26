import React from "react";
import Skeleton from "@mui/material/Skeleton";
import Box from "@mui/material/Box";
import { useThemeMode } from "../../contexts/ThemeContext";

/**
 * Strict Design System Skeleton Component
 * Variants:
 * - 'card': 20px radius card placeholder
 * - 'text': text line placeholder
 * - 'avatar': circular placeholder
 * - 'button': 12px radius button placeholder
 */
export default function AppSkeleton({
  variant = "text",
  width,
  height,
  lines = 1,
  sx = {},
  ...props
}) {
  const { tokens, isDark } = useThemeMode();

  const getBorderRadius = () => {
    switch (variant) {
      case "card":
        return tokens.radii.card;
      case "button":
      case "input":
        return tokens.radii.button;
      case "avatar":
        return "50%";
      case "badge":
        return tokens.radii.badge;
      case "text":
      default:
        return "6px";
    }
  };

  const getDefaultHeight = () => {
    switch (variant) {
      case "card":
        return 160;
      case "button":
        return tokens.buttonHeights.normal;
      case "avatar":
        return 40;
      case "text":
      default:
        return 20;
    }
  };

  const baseSx = {
    borderRadius: getBorderRadius(),
    backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
    ...sx
  };

  if (variant === "text" && lines > 1) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: width || "100%" }}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            height={height || 18}
            width={i === lines - 1 && lines > 1 ? "60%" : "100%"}
            sx={baseSx}
            {...props}
          />
        ))}
      </Box>
    );
  }

  return (
    <Skeleton
      variant="rectangular"
      width={width || (variant === "avatar" ? (height || 40) : "100%")}
      height={height || getDefaultHeight()}
      sx={baseSx}
      {...props}
    />
  );
}
