import React from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useThemeMode } from "../../contexts/ThemeContext";

/**
 * Strict Design System IconButton Component
 *
 * Variants:
 * - default: subtle border & surface background
 * - ghost: transparent
 * - primary: primary color
 * - danger: danger color
 */
export default function AppIconButton({
  children,
  tooltip = "",
  variant = "default",
  size = "normal", // 'normal' (40px) | 'large' (48px) | 'small' (32px)
  shape = "rounded", // 'rounded' (12px) | 'round' (pill / 999px)
  active = false,
  disabled = false,
  onClick,
  ariaLabel,
  sx = {},
  ...props
}) {
  const themeContext = useThemeMode();
  const tokens = themeContext?.tokens || {};
  const isDark = Boolean(themeContext?.isDark);
  const c = tokens?.colors || {};

  const getDimensions = () => {
    switch (size) {
      case "large":
        return { width: 48, height: 48, iconSize: "24px" };
      case "small":
        return { width: 32, height: 32, iconSize: "18px" };
      case "normal":
      default:
        return { width: 40, height: 40, iconSize: "20px" };
    }
  };

  const dim = getDimensions();
  const borderRadius = shape === "round"
    ? (tokens?.radii?.badge || "999px")
    : (tokens?.radii?.button || "12px");

  const getVariantStyles = () => {
    const primary = c?.primary || (isDark ? "#3b82f6" : "#2563eb");
    const primaryHover = c?.primaryHover || (isDark ? "#60a5fa" : "#1d4ed8");
    const surface = c?.surface || (isDark ? "#111827" : "#ffffff");
    const border = c?.border || (isDark ? "#1f2937" : "#e2e8f0");
    const textHeading = c?.textHeading || (isDark ? "#f1f5f9" : "#0f172a");
    const danger = c?.danger || "#dc2626";
    const dangerHover = c?.dangerHover || "#b91c1c";

    if (active) {
      return {
        backgroundColor: primary,
        color: "#ffffff",
        border: "1px solid transparent",
        "&:hover": {
          backgroundColor: primaryHover
        }
      };
    }

    switch (variant) {
      case "ghost":
        return {
          backgroundColor: "transparent",
          color: textHeading,
          border: "1px solid transparent",
          "&:hover": {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"
          }
        };

      case "primary":
        return {
          backgroundColor: primary,
          color: "#ffffff",
          border: "1px solid transparent",
          "&:hover": {
            backgroundColor: primaryHover
          }
        };

      case "danger":
        return {
          backgroundColor: danger,
          color: "#ffffff",
          border: "1px solid transparent",
          "&:hover": {
            backgroundColor: dangerHover
          }
        };

      case "default":
      default:
        return {
          backgroundColor: surface,
          color: textHeading,
          border: `1px solid ${border}`,
          "&:hover": {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9",
            borderColor: isDark ? primary : border
          }
        };
    }
  };

  const label = ariaLabel || tooltip;

  const button = (
    <IconButton
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      sx={{
        width: dim.width,
        height: dim.height,
        borderRadius,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        transition: `all ${tokens?.motion?.micro || "150ms ease"}`,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? "not-allowed !important" : "pointer",
        "& .MuiSvgIcon-root": {
          fontSize: dim.iconSize
        },
        "&:focus-visible": {
          outline: `2px solid ${c?.primary || "#2563eb"}`,
          outlineOffset: "2px"
        },
        ...getVariantStyles(),
        ...sx
      }}
      {...props}
    >
      {children}
    </IconButton>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow enterDelay={400} enterNextDelay={200}>
        <span>{button}</span>
      </Tooltip>
    );
  }

  return button;
}
