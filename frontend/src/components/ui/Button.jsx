import React from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { useThemeMode } from "../../contexts/ThemeContext";

/**
 * Strict Design System Button Component
 *
 * Variants:
 * - primary: filled blue (#2563eb / #3b82f6)
 * - secondary: outline primary
 * - danger: filled red (#dc2626)
 * - ghost: transparent with soft hover
 *
 * Sizes:
 * - large: 48px height
 * - normal: 40px height
 * - small: 32px height
 */
export default function AppButton({
  children,
  variant = "primary",
  size = "normal",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  onClick,
  type = "button",
  sx = {},
  ...props
}) {
  const { tokens, isDark } = useThemeMode();
  const c = tokens.colors;

  const getMinHeight = () => {
    switch (size) {
      case "large":
        return tokens.buttonHeights.large;
      case "small":
        return tokens.buttonHeights.small;
      case "normal":
      default:
        return tokens.buttonHeights.normal;
    }
  };

  const getFontSize = () => {
    return size === "small" ? "13px" : tokens.typography.button.fontSize;
  };

  const getPadding = () => {
    switch (size) {
      case "large":
        return "12px 24px";
      case "small":
        return "4px 12px";
      case "normal":
      default:
        return "8px 18px";
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "secondary":
        return {
          backgroundColor: "transparent",
          color: c.primary,
          border: `1px solid ${isDark ? c.primary : c.border}`,
          "&:hover": {
            backgroundColor: c.primarySoftBg,
            borderColor: c.primaryHover
          },
          "&:active": {
            backgroundColor: isDark ? "rgba(59, 130, 246, 0.25)" : "#dbeafe"
          }
        };
      case "danger":
        return {
          backgroundColor: c.danger,
          color: "#ffffff",
          border: "1px solid transparent",
          "&:hover": {
            backgroundColor: c.dangerHover
          },
          "&:active": {
            backgroundColor: isDark ? "#991b1b" : "#b91c1c"
          }
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          color: c.textHeading,
          border: "1px solid transparent",
          "&:hover": {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)"
          },
          "&:active": {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.10)" : "rgba(0, 0, 0, 0.08)"
          }
        };
      case "primary":
      default:
        return {
          backgroundColor: c.primary,
          color: "#ffffff",
          border: "1px solid transparent",
          "&:hover": {
            backgroundColor: c.primaryHover
          },
          "&:active": {
            backgroundColor: c.primaryPressed
          }
        };
    }
  };

  const spinnerColor = variant === "primary" || variant === "danger" ? "#ffffff" : c.primary;

  return (
    <Button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      fullWidth={fullWidth}
      sx={{
        borderRadius: tokens.radii.button,
        minHeight: getMinHeight(),
        padding: getPadding(),
        fontSize: getFontSize(),
        fontFamily: tokens.typography.fonts.body,
        fontWeight: tokens.typography.button.weight,
        textTransform: "none",
        letterSpacing: "0",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        boxShadow: "none",
        transition: `all ${tokens.motion.micro}`,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed !important" : "pointer",
        pointerEvents: disabled ? "none" : "auto",
        "&:focus-visible": {
          outline: `2px solid ${c.primary}`,
          outlineOffset: "2px"
        },
        ...getVariantStyles(),
        ...sx
      }}
      {...props}
    >
      {loading ? (
        <CircularProgress size={18} sx={{ color: spinnerColor }} thickness={4} />
      ) : (
        <>
          {leftIcon && (
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", fontSize: "20px" }}>
              {leftIcon}
            </Box>
          )}
          {children}
          {rightIcon && (
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", fontSize: "20px" }}>
              {rightIcon}
            </Box>
          )}
        </>
      )}
    </Button>
  );
}
