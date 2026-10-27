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
  const themeContext = useThemeMode();
  const tokens = themeContext?.tokens || {};
  const isDark = Boolean(themeContext?.isDark);
  const c = tokens?.colors || {};

  const getMinHeight = () => {
    switch (size) {
      case "large":
        return tokens?.buttonHeights?.large || "48px";
      case "small":
        return tokens?.buttonHeights?.small || "32px";
      case "normal":
      default:
        return tokens?.buttonHeights?.normal || "40px";
    }
  };

  const getFontSize = () => {
    return size === "small" ? "13px" : (tokens?.typography?.button?.fontSize || "14px");
  };

  const getPadding = () => {
    switch (size) {
      case "large":
        return "12px 24px";
      case "small":
        return "4px 12px";
      case "normal":
      default:
        return "8px 16px";
    }
  };

  const getVariantStyles = () => {
    const primary = c?.primary || (isDark ? "#3b82f6" : "#2563eb");
    const primaryHover = c?.primaryHover || (isDark ? "#60a5fa" : "#1d4ed8");
    const primaryPressed = c?.primaryPressed || (isDark ? "#2563eb" : "#1e40af");
    const danger = c?.danger || "#dc2626";
    const dangerHover = c?.dangerHover || "#b91c1c";
    const surface = c?.surface || (isDark ? "#111827" : "#ffffff");
    const border = c?.border || (isDark ? "#1f2937" : "#e2e8f0");
    const textHeading = c?.textHeading || (isDark ? "#f1f5f9" : "#0f172a");

    switch (variant) {
      case "secondary":
        return {
          backgroundColor: surface,
          color: primary,
          border: `1px solid ${isDark ? primary : border}`,
          "&:hover": {
            backgroundColor: c?.primarySoftBg || (isDark ? "rgba(59, 130, 246, 0.15)" : "#eff6ff"),
            borderColor: primaryHover
          },
          "&:active": {
            backgroundColor: c?.primarySoftBg || (isDark ? "rgba(59, 130, 246, 0.2)" : "#dbeafe")
          }
        };

      case "danger":
        return {
          backgroundColor: danger,
          color: "#ffffff",
          border: "1px solid transparent",
          "&:hover": {
            backgroundColor: dangerHover
          },
          "&:active": {
            backgroundColor: dangerHover
          }
        };

      case "ghost":
        return {
          backgroundColor: "transparent",
          color: textHeading,
          border: "1px solid transparent",
          "&:hover": {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"
          },
          "&:active": {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"
          }
        };

      case "primary":
      default:
        return {
          backgroundColor: primary,
          color: "#ffffff",
          border: "1px solid transparent",
          "&:hover": {
            backgroundColor: primaryHover
          },
          "&:active": {
            backgroundColor: primaryPressed
          }
        };
    }
  };

  const spinnerColor = variant === "primary" || variant === "danger" ? "#ffffff" : (c?.primary || "#2563eb");

  return (
    <Button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      fullWidth={fullWidth}
      sx={{
        borderRadius: tokens?.radii?.button || "12px",
        minHeight: getMinHeight(),
        padding: getPadding(),
        fontSize: getFontSize(),
        fontFamily: tokens?.typography?.fonts?.body || "Inter, sans-serif",
        fontWeight: tokens?.typography?.button?.weight || 600,
        textTransform: "none",
        letterSpacing: "0",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        boxShadow: "none",
        transition: `all ${tokens?.motion?.micro || "150ms ease"}`,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed !important" : "pointer",
        pointerEvents: disabled ? "none" : "auto",
        "&:focus-visible": {
          outline: `2px solid ${c?.primary || "#2563eb"}`,
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
