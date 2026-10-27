import React from "react";
import Box from "@mui/material/Box";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputAdornment from "@mui/material/InputAdornment";
import Typography from "@mui/material/Typography";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import { useThemeMode } from "../../contexts/ThemeContext";

/**
 * Strict Design System Input Component
 * - 12px radius
 * - 16px text size (strictly avoids iOS zoom)
 * - 40px height (single-line)
 * - Clear error message below in red with MUI outlined icon
 * - Prefix & suffix icon adornments
 */
export default function AppInput({
  label,
  value,
  onChange,
  placeholder,
  error,
  helperText,
  prefixIcon,
  suffixIcon,
  type = "text",
  disabled = false,
  fullWidth = true,
  required = false,
  multiline = false,
  rows = 3,
  id,
  name,
  autoComplete,
  autoFocus = false,
  sx = {},
  inputProps = {},
  ...props
}) {
  const themeContext = useThemeMode();
  const tokens = themeContext?.tokens || {};
  const isDark = Boolean(themeContext?.isDark);
  const c = tokens?.colors || {};

  const inputId = id || (name ? `input-${name}` : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;

  const border = c?.border || (isDark ? "#1f2937" : "#e2e8f0");
  const primary = c?.primary || (isDark ? "#3b82f6" : "#2563eb");
  const danger = c?.danger || "#dc2626";
  const surface = c?.surface || (isDark ? "#111827" : "#ffffff");
  const textHeading = c?.textHeading || (isDark ? "#f1f5f9" : "#0f172a");
  const placeholderColor = c?.placeholder || (isDark ? "#64748b" : "#94a3b8");

  return (
    <Box sx={{ width: fullWidth ? "100%" : "auto", display: "flex", flexDirection: "column", mb: 2 }}>
      {label && (
        <Box
          component="label"
          htmlFor={inputId}
          sx={{
            display: "block",
            fontSize: tokens?.typography?.label?.fontSize || "14px",
            fontWeight: tokens?.typography?.label?.weight || 500,
            fontFamily: tokens?.typography?.fonts?.body || "Inter, sans-serif",
            color: error ? danger : textHeading,
            mb: "6px"
          }}
        >
          {label}
          {required && (
            <Box component="span" sx={{ color: danger, ml: "4px" }}>
              *
            </Box>
          )}
        </Box>
      )}

      <OutlinedInput
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        fullWidth={fullWidth}
        multiline={multiline}
        rows={multiline ? rows : undefined}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        error={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        aria-invalid={Boolean(error)}
        startAdornment={
          prefixIcon ? (
            <InputAdornment position="start" sx={{ color: c?.textMuted || "#64748b", mr: 1 }}>
              {prefixIcon}
            </InputAdornment>
          ) : undefined
        }
        endAdornment={
          suffixIcon ? (
            <InputAdornment position="end" sx={{ color: c?.textMuted || "#64748b", ml: 1 }}>
              {suffixIcon}
            </InputAdornment>
          ) : undefined
        }
        inputProps={{
          ...inputProps,
          style: {
            padding: multiline ? "0" : "10px 14px",
            fontSize: tokens?.typography?.input?.fontSize || "16px",
            fontFamily: tokens?.typography?.fonts?.body || "Inter, sans-serif",
            color: textHeading
          }
        }}
        sx={{
          borderRadius: tokens?.radii?.input || "12px",
          backgroundColor: surface,
          minHeight: multiline ? "auto" : (tokens?.buttonHeights?.normal || "40px"),
          fontSize: tokens?.typography?.input?.fontSize || "16px",
          fontFamily: tokens?.typography?.fonts?.body || "Inter, sans-serif",
          transition: `all ${tokens?.motion?.micro || "150ms ease"}`,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: error ? danger : border,
            borderWidth: error ? "2px" : "1px"
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: error ? danger : primary
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: error ? danger : primary,
            borderWidth: "2px"
          },
          "& input::placeholder": {
            color: placeholderColor,
            opacity: 1
          },
          "& textarea::placeholder": {
            color: placeholderColor,
            opacity: 1
          },
          ...sx
        }}
        {...props}
      />

      {error && (
        <Box
          id={errorId}
          role="alert"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            mt: "6px",
            color: danger,
            fontSize: tokens?.typography?.caption?.fontSize || "13px",
            fontFamily: tokens?.typography?.fonts?.body || "Inter, sans-serif"
          }}
        >
          <ErrorOutlineOutlinedIcon sx={{ fontSize: "16px", flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: danger, fontWeight: 500, fontSize: "13px" }}>
            {error}
          </Typography>
        </Box>
      )}

      {!error && helperText && (
        <Typography
          id={helperId}
          variant="caption"
          sx={{
            display: "block",
            mt: "6px",
            color: c?.textMuted || (isDark ? "#94a3b8" : "#64748b"),
            fontSize: tokens?.typography?.caption?.fontSize || "13px",
            fontFamily: tokens?.typography?.fonts?.body || "Inter, sans-serif"
          }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
