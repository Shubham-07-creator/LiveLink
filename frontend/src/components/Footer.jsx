import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Divider from "@mui/material/Divider";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import { useThemeMode } from "../contexts/ThemeContext";

export default function Footer() {
  const themeContext = useThemeMode();
  const tokens = themeContext?.tokens || {};
  const c = tokens?.colors || {};

  return (
    <Box
      component="footer"
      sx={{
        width: "100%",
        backgroundColor: c.surface,
        borderTop: `1px solid ${c.border}`,
        mt: "auto",
        pt: { xs: 5, md: 6 },
        pb: 4,
        color: c.textMuted
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="space-between">
          {/* Brand column */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Box
                component="img"
                src="/video.svg"
                alt="LiveLink"
                sx={{ width: 32, height: 32 }}
              />
              <Typography variant="h6" sx={{ fontFamily: tokens.typography.fonts.heading, fontWeight: 800, color: c.textHeading }}>
                Live<Box component="span" sx={{ color: c.primary }}>Link</Box>
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: c.textMuted, lineHeight: 1.7, mb: 2 }}>
              Direct WebRTC peer-to-peer video meetings. Fast audio and video with encrypted peer-to-peer privacy.
            </Typography>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: c.success, fontSize: "13px", fontWeight: 600 }}>
                <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} />
                <span>Encrypted peer-to-peer</span>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: c.primary, fontSize: "13px", fontWeight: 600 }}>
                <LockOutlinedIcon sx={{ fontSize: 16 }} />
                <span>Zero logs</span>
              </Box>
            </Box>
          </Grid>

          {/* Features column */}
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: c.textHeading, mb: 2 }}>
              Features
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Link href="/home" underline="hover" sx={{ color: c.textMuted, fontSize: "14px" }}>1-to-1 calls</Link>
              <Link href="/home" underline="hover" sx={{ color: c.textMuted, fontSize: "14px" }}>Group meetings</Link>
              <Link href="/home" underline="hover" sx={{ color: c.textMuted, fontSize: "14px" }}>Screen sharing</Link>
              <Link href="/home" underline="hover" sx={{ color: c.textMuted, fontSize: "14px" }}>Record to your device</Link>
            </Box>
          </Grid>

          {/* Navigation column */}
          <Grid item xs={6} sm={4} md={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: c.textHeading, mb: 2 }}>
              Navigation
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Link href="/" underline="hover" sx={{ color: c.textMuted, fontSize: "14px" }}>Landing page</Link>
              <Link href="/home" underline="hover" sx={{ color: c.textMuted, fontSize: "14px" }}>Dashboard</Link>
              <Link href="/history" underline="hover" sx={{ color: c.textMuted, fontSize: "14px" }}>Meeting history</Link>
              <Link href="/profile" underline="hover" sx={{ color: c.textMuted, fontSize: "14px" }}>Account settings</Link>
            </Box>
          </Grid>

          {/* Info column */}
          <Grid item xs={12} sm={4} md={3}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: c.textHeading, mb: 2 }}>
              Simple and private
            </Typography>
            <Typography variant="body2" sx={{ color: c.textMuted, lineHeight: 1.6, fontSize: "14px" }}>
              LiveLink makes video calling accessible to everyone directly in modern browsers with zero downloads or extensions.
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 4, borderColor: c.border }} />

        <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: "center", gap: 2 }}>
          <Typography variant="caption" sx={{ color: c.textMuted }}>
            © {new Date().getFullYear()} LiveLink. Encrypted peer-to-peer video calling.
          </Typography>
          <Box sx={{ display: "flex", gap: 3 }}>
            <Link href="#" underline="hover" sx={{ color: c.textMuted, fontSize: "13px" }}>Privacy policy</Link>
            <Link href="#" underline="hover" sx={{ color: c.textMuted, fontSize: "13px" }}>Terms of service</Link>
            <Link href="#" underline="hover" sx={{ color: c.textMuted, fontSize: "13px" }}>Security</Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
