import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import AppIconButton from "./IconButton";
import { useThemeMode } from "../../contexts/ThemeContext";

/**
 * Strict Design System Modal Component
 * - 24px radius
 * - Backdrop blur 4px
 * - max-width 480px default
 * - Close button top-right
 * - Title + description + children + actions
 */
export default function AppModal({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  maxWidth = "xs", // default 480px approx
  showCloseButton = true,
  ariaLabel = "dialog",
  ...props
}) {
  const themeContext = useThemeMode();
  const tokens = themeContext?.tokens || {};
  const isDark = Boolean(themeContext?.isDark);
  const c = tokens?.colors || {};

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      aria-labelledby={title ? "modal-dialog-title" : undefined}
      aria-describedby={description ? "modal-dialog-description" : undefined}
      BackdropProps={{
        sx: {
          backdropFilter: "blur(4px)",
          backgroundColor: "rgba(15, 23, 42, 0.65)"
        }
      }}
      PaperProps={{
        sx: {
          borderRadius: tokens?.radii?.modal || "24px",
          border: `1px solid ${c?.border || (isDark ? "#1f2937" : "#e2e8f0")}`,
          backgroundColor: c?.surface || (isDark ? "#111827" : "#ffffff"),
          boxShadow: c?.modalShadow || "none",
          padding: 2,
          position: "relative"
        }
      }}
      {...props}
    >
      {(title || showCloseButton) && (
        <DialogTitle
          id="modal-dialog-title"
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            p: 2,
            pb: description ? 0.5 : 1.5
          }}
        >
          <Box sx={{ pr: 3 }}>
            {title && (
              <Typography
                variant="h5"
                component="div"
                sx={{
                  fontFamily: tokens?.typography?.fonts?.heading || "Plus Jakarta Sans, sans-serif",
                  fontWeight: tokens?.typography?.cardTitle?.weight || 600,
                  fontSize: tokens?.typography?.cardTitle?.fontSize || "18px",
                  color: c?.textHeading || (isDark ? "#f1f5f9" : "#0f172a")
                }}
              >
                {title}
              </Typography>
            )}
            {description && (
              <Typography
                id="modal-dialog-description"
                variant="body2"
                sx={{
                  color: c?.textMuted || (isDark ? "#94a3b8" : "#64748b"),
                  mt: 0.5,
                  fontSize: tokens?.typography?.caption?.fontSize || "13px",
                  fontFamily: tokens?.typography?.fonts?.body || "Inter, sans-serif"
                }}
              >
                {description}
              </Typography>
            )}
          </Box>
          {showCloseButton && onClose && (
            <AppIconButton
              tooltip="Close"
              variant="ghost"
              size="small"
              onClick={onClose}
              sx={{ position: "absolute", top: 16, right: 16 }}
            >
              <CloseOutlinedIcon />
            </AppIconButton>
          )}
        </DialogTitle>
      )}

      <DialogContent sx={{ p: 2, pt: title ? 1 : 2 }}>
        {children}
      </DialogContent>

      {actions && (
        <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}
