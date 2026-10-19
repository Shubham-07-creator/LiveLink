import React from "react";
import { Box, Typography, Container, Grid, Link, Divider } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import LockIcon from "@mui/icons-material/Lock";

export default function Footer() {
    return (
        <Box
            component="footer"
            sx={{
                width: "100%",
                backgroundColor: "#ffffff",
                borderTop: "1px solid #e2e8f0",
                mt: "auto",
                pt: { xs: 5, md: 6 },
                pb: 4,
                color: "#475569"
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
                            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                Live<span style={{ color: "#2563eb" }}>Link</span>
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.7, mb: 2 }}>
                            Direct WebRTC peer-to-peer video meetings. Ultra-fast HD audio & video with encrypted peer-to-peer privacy for personal conversations and team conferences.
                        </Typography>
                        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#16a34a", fontSize: "0.85rem", fontWeight: 600 }}>
                                <SecurityIcon sx={{ fontSize: 16 }} /> Encrypted peer-to-peer
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#2563eb", fontSize: "0.85rem", fontWeight: 600 }}>
                                <LockIcon sx={{ fontSize: 16 }} /> Zero Logs
                            </Box>
                        </Box>
                    </Grid>

                    {/* Features column */}
                    <Grid item xs={6} sm={4} md={2}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0f172a", mb: 2 }}>
                            Features
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <Link href="/home" underline="hover" sx={{ color: "#64748b", fontSize: "0.9rem" }}>1-to-1 Calls</Link>
                            <Link href="/home" underline="hover" sx={{ color: "#64748b", fontSize: "0.9rem" }}>Group Meetings</Link>
                            <Link href="/home" underline="hover" sx={{ color: "#64748b", fontSize: "0.9rem" }}>Screen Sharing</Link>
                            <Link href="/home" underline="hover" sx={{ color: "#64748b", fontSize: "0.9rem" }}>Record to your device</Link>
                        </Box>
                    </Grid>

                    {/* Navigation column */}
                    <Grid item xs={6} sm={4} md={2}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0f172a", mb: 2 }}>
                            Navigation
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <Link href="/" underline="hover" sx={{ color: "#64748b", fontSize: "0.9rem" }}>Landing Page</Link>
                            <Link href="/home" underline="hover" sx={{ color: "#64748b", fontSize: "0.9rem" }}>Dashboard</Link>
                            <Link href="/history" underline="hover" sx={{ color: "#64748b", fontSize: "0.9rem" }}>Call History</Link>
                            <Link href="/profile" underline="hover" sx={{ color: "#64748b", fontSize: "0.9rem" }}>My Profile</Link>
                        </Box>
                    </Grid>

                    {/* Simple & Free column */}
                    <Grid item xs={12} sm={4} md={3}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0f172a", mb: 2 }}>
                            Simple &amp; Free
                        </Typography>
                        <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.6 }}>
                            LiveLink makes high-quality video calling accessible to everyone directly in the browser with zero downloads required.
                        </Typography>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 4, borderColor: "#e2e8f0" }} />

                <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: "center", gap: 2 }}>
                    <Typography variant="body2" sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                        © {new Date().getFullYear()} LiveLink. All rights reserved. Distance means nothing with LiveLink.
                    </Typography>
                    <Box sx={{ display: "flex", gap: 3 }}>
                        <Link href="#" underline="hover" sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>Privacy Policy</Link>
                        <Link href="#" underline="hover" sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>Terms of Service</Link>
                        <Link href="#" underline="hover" sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>Security</Link>
                    </Box>
                </Box>
            </Container>
        </Box>
    );
}
