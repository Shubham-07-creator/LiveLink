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
  const { tokens } = useThemeMode();
  const c = tokens.colors;

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
          borderRadius: tokens.radii.modal,
          border: `1px solid ${c.border}`,
          backgroundColor: c.surface,
          boxShadow: c.modalShadow,
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
                  fontFamily: tokens.typography.fonts.heading,
                  fontWeight: tokens.typography.cardTitle.weight,
                  fontSize: tokens.typography.cardTitle.fontSize,
                  color: c.textHeading
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
                  color: c.textMuted,
                  mt: 0.5,
                  fontSize: tokens.typography.caption.fontSize,
                  fontFamily: tokens.typography.fonts.body
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
