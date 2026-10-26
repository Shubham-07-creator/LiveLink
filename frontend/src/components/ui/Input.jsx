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
  const { tokens } = useThemeMode();
  const c = tokens.colors;

  const inputId = id || (name ? `input-${name}` : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;

  return (
    <Box sx={{ width: fullWidth ? "100%" : "auto", display: "flex", flexDirection: "column", mb: 2 }}>
      {label && (
        <Box
          component="label"
          htmlFor={inputId}
          sx={{
            display: "block",
            fontSize: tokens.typography.label.fontSize,
            fontWeight: tokens.typography.label.weight,
            fontFamily: tokens.typography.fonts.body,
            color: error ? c.danger : c.textHeading,
            mb: "6px"
          }}
        >
          {label} {required && <Box component="span" sx={{ color: c.danger }}>*</Box>}
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
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        startAdornment={
          prefixIcon ? (
            <InputAdornment position="start" sx={{ color: c.textMuted }}>
              {prefixIcon}
            </InputAdornment>
          ) : null
        }
        endAdornment={
          suffixIcon ? (
            <InputAdornment position="end" sx={{ color: c.textMuted }}>
              {suffixIcon}
            </InputAdornment>
          ) : null
        }
        inputProps={{
          style: {
            fontSize: tokens.typography.input.fontSize,
            fontFamily: tokens.typography.fonts.body,
            height: multiline ? "auto" : "1.25em"
          },
          ...inputProps
        }}
        sx={{
          borderRadius: tokens.radii.input,
          backgroundColor: c.surface,
          minHeight: multiline ? "auto" : tokens.buttonHeights.normal,
          fontSize: tokens.typography.input.fontSize,
          fontFamily: tokens.typography.fonts.body,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: error ? c.danger : c.border
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: error ? c.danger : c.primary
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: error ? c.danger : c.primary,
            borderWidth: "2px"
          },
          ...sx
        }}
        {...props}
      />

      {error ? (
        <Box
          id={errorId}
          role="alert"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            mt: "6px",
            color: c.danger,
            fontSize: tokens.typography.caption.fontSize,
            fontFamily: tokens.typography.fonts.body
          }}
        >
          <ErrorOutlineOutlinedIcon sx={{ fontSize: "16px" }} />
          <span>{error}</span>
        </Box>
      ) : helperText ? (
        <Typography
          id={helperId}
          variant="caption"
          sx={{
            mt: "6px",
            color: c.textMuted,
            fontSize: tokens.typography.caption.fontSize,
            fontFamily: tokens.typography.fonts.body
          }}
        >
          {helperText}
        </Typography>
      ) : null}
    </Box>
  );
}
