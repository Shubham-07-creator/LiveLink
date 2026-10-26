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
  const { tokens, isDark } = useThemeMode();
  const c = tokens.colors;

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
  const borderRadius = shape === "round" ? tokens.radii.badge : tokens.radii.button;

  const getVariantStyles = () => {
    if (active) {
      return {
        backgroundColor: c.primary,
        color: "#ffffff",
        border: "1px solid transparent",
        "&:hover": {
          backgroundColor: c.primaryHover
        }
      };
    }

    switch (variant) {
      case "ghost":
        return {
          backgroundColor: "transparent",
          color: c.textHeading,
          border: "1px solid transparent",
          "&:hover": {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)"
          }
        };
      case "danger":
        return {
          backgroundColor: c.dangerSoftBg,
          color: c.danger,
          border: `1px solid ${isDark ? "transparent" : "#fecaca"}`,
          "&:hover": {
            backgroundColor: c.danger,
            color: "#ffffff"
          }
        };
      case "primary":
        return {
          backgroundColor: c.primarySoftBg,
          color: c.primary,
          border: `1px solid ${c.primarySoftBorder}`,
          "&:hover": {
            backgroundColor: c.primary,
            color: "#ffffff"
          }
        };
      case "default":
      default:
        return {
          backgroundColor: c.surface,
          color: c.textHeading,
          border: `1px solid ${c.border}`,
          "&:hover": {
            borderColor: c.primary,
            color: c.primary,
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#f8fafc"
          }
        };
    }
  };

  const buttonElement = (
    <IconButton
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel || tooltip || "button"}
      sx={{
        width: dim.width,
        height: dim.height,
        minWidth: dim.width,
        minHeight: dim.height,
        borderRadius,
        transition: `all ${tokens.motion.micro}`,
        opacity: disabled ? 0.45 : 1,
        "& .MuiSvgIcon-root": {
          fontSize: dim.iconSize
        },
        "&:focus-visible": {
          outline: `2px solid ${c.primary}`,
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
      <Tooltip title={tooltip} arrow enterDelay={400}>
        <span>{buttonElement}</span>
      </Tooltip>
    );
  }

  return buttonElement;
}
