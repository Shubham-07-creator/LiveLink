import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/system";

const floatUp = keyframes`
  0% {
    transform: translateY(0) scale(0.8);
    opacity: 1;
  }
  50% {
    transform: translateY(-80px) scale(1.2);
    opacity: 0.9;
  }
  100% {
    transform: translateY(-160px) scale(1);
    opacity: 0;
  }
`;

export default function FloatingReactions({ reactions = [] }) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 90,
        right: 32,
        pointerEvents: "none",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 1
      }}
    >
      {reactions.slice(-6).map((r, i) => (
        <Box
          key={r.id || `${r.timestamp || Date.now()}-${i}`}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            p: "6px 14px",
            borderRadius: "999px",
            bgcolor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            animation: `${floatUp} 2.5s ease-out forwards`
          }}
        >
          <Typography sx={{ fontSize: "24px", lineHeight: 1 }}>{r.emoji}</Typography>
          {r.sender && (
            <Typography sx={{ fontSize: "12px", color: "#cbd5e1", fontWeight: 600 }}>
              {r.sender}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}
