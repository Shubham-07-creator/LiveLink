import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useThemeMode } from "../../contexts/ThemeContext";

const SHORTCUTS = [
  { key: "M", label: "Mute / unmute microphone" },
  { key: "V", label: "Turn camera on / off" },
  { key: "S", label: "Start / stop screen share" },
  { key: "H", label: "Raise / lower hand" },
  { key: "C", label: "Open / close chat drawer" },
  { key: "P", label: "Open / close participants drawer" },
  { key: "Esc", label: "Close active drawer or modal" },
  { key: "?", label: "Open this keyboard shortcuts guide" }
];

export default function KeyboardShortcutsModal({ open, onClose }) {
  const themeContext = useThemeMode();
  const tokens = themeContext?.tokens || {};
  const isDark = Boolean(themeContext?.isDark);
  const c = tokens?.colors || {};

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="Navigate meetings faster using standard key commands:"
      maxWidth="xs"
      actions={
        <Button variant="primary" size="small" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
        {SHORTCUTS.map((item, idx) => (
          <React.Fragment key={item.key}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: c.textHeading,
                  fontSize: "14px",
                  fontWeight: 500
                }}
              >
                {item.label}
              </Typography>
              <Box
                component="kbd"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "28px",
                  height: "26px",
                  px: "8px",
                  borderRadius: "6px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  fontWeight: 700,
                  bgcolor: isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9",
                  border: `1px solid ${c.border}`,
                  boxShadow: isDark ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
                  color: c.textHeading
                }}
              >
                {item.key}
              </Box>
            </Box>
            {idx < SHORTCUTS.length - 1 && (
              <Divider sx={{ borderColor: c.border, opacity: 0.6 }} />
            )}
          </React.Fragment>
        ))}
      </Box>
    </Modal>
  );
}
