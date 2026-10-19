import React, { useContext, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import {
    Box,
    Button,
    Avatar,
    Chip,
    Tooltip,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider,
    Typography
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HistoryIcon from "@mui/icons-material/History";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useThemeMode } from "../contexts/ThemeContext";

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { userData, handleLogout } = useContext(AuthContext);
    const { mode, toggleTheme } = useThemeMode();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (path) => location.pathname === path;
    const token = localStorage.getItem("token");
    const isLoggedIn = Boolean(userData || token);

    const navItems = [
        { label: "Dashboard", path: "/home", icon: <DashboardIcon sx={{ fontSize: 20 }} /> },
        { label: "Call History", path: "/history", icon: <HistoryIcon sx={{ fontSize: 20 }} /> },
        { label: "Profile", path: "/profile", icon: <PersonIcon sx={{ fontSize: 20 }} /> },
    ];

    const handleNavClick = (path) => {
        setMobileOpen(false);
        navigate(path);
    };

    return (
        <Box
            component="header"
            sx={{
                width: "100%",
                height: "72px",
                backgroundColor: mode === "dark" ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(12px)",
                borderBottom: "1px solid",
                borderColor: "divider",
                position: "sticky",
                top: 0,
                zIndex: 1100,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingInline: { xs: "1.2rem", sm: "2.5rem" },
                boxShadow: mode === "dark" ? "0 2px 8px rgba(0, 0, 0, 0.3)" : "0 2px 8px rgba(15, 23, 42, 0.03)"
            }}
        >
            {/* Left: Brand Logo */}
            <Box
                onClick={() => navigate(isLoggedIn ? "/home" : "/")}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                    userSelect: "none"
                }}
            >
                <Box
                    component="img"
                    src="/video.svg"
                    alt="LiveLink Logo"
                    sx={{ width: 36, height: 36 }}
                />
                <Box sx={{ display: "flex", alignItems: "baseline" }}>
                    <Typography sx={{ fontSize: "1.55rem", fontWeight: 800, color: "text.primary", letterSpacing: "-0.5px" }}>
                        Live<span style={{ color: "#2563eb" }}>Link</span>
                    </Typography>
                </Box>
            </Box>

            {/* Center Desktop Navigation Links */}
            {isLoggedIn && (
                <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1 }}>
                    {navItems.map((item) => (
                        <Button
                            key={item.path}
                            startIcon={item.icon}
                            onClick={() => handleNavClick(item.path)}
                            sx={{
                                color: isActive(item.path) ? "#2563eb" : "text.secondary",
                                fontWeight: isActive(item.path) ? 700 : 500,
                                backgroundColor: isActive(item.path) ? (mode === "dark" ? "rgba(37, 99, 235, 0.18)" : "rgba(37, 99, 235, 0.08)") : "transparent",
                                borderRadius: "10px",
                                px: 2,
                                py: 0.9,
                                textTransform: "none",
                                fontSize: "0.92rem",
                                transition: "all 0.15s ease",
                                "&:hover": {
                                    backgroundColor: mode === "dark" ? "rgba(37, 99, 235, 0.25)" : "rgba(37, 99, 235, 0.06)",
                                    color: "#2563eb"
                                }
                            }}
                        >
                            {item.label}
                        </Button>
                    ))}
                </Box>
            )}

            {/* Right Desktop Actions */}
            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1.5 }}>
                {/* Light/Dark Mode Toggle Button */}
                <Tooltip title={mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                    <IconButton
                        onClick={toggleTheme}
                        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        sx={{
                            color: "text.primary",
                            borderRadius: "10px",
                            border: "1px solid",
                            borderColor: "divider",
                            backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#f8fafc",
                            p: 0.9,
                            "&:hover": { backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "#f1f5f9" }
                        }}
                    >
                        {mode === "dark" ? <LightModeIcon sx={{ fontSize: 20, color: "#f59e0b" }} /> : <DarkModeIcon sx={{ fontSize: 20, color: "#64748b" }} />}
                    </IconButton>
                </Tooltip>

                {isLoggedIn ? (
                    <>
                        {userData && (
                            <Chip
                                avatar={
                                    <Avatar
                                        src={userData.avatar}
                                        alt={userData.name}
                                        sx={{ width: 28, height: 28 }}
                                    />
                                }
                                label={userData.name || userData.username || "Account"}
                                onClick={() => navigate("/profile")}
                                sx={{
                                    backgroundColor: mode === "dark" ? "rgba(255,255,255,0.06)" : "#f8fafc",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    fontWeight: 600,
                                    color: "text.primary",
                                    cursor: "pointer",
                                    px: 0.5,
                                    py: 2,
                                    "&:hover": {
                                        backgroundColor: mode === "dark" ? "rgba(255,255,255,0.12)" : "#f1f5f9"
                                    }
                                }}
                            />
                        )}

                        <Tooltip title="Log out of LiveLink">
                            <Button
                                startIcon={<LogoutIcon sx={{ fontSize: 17 }} />}
                                onClick={handleLogout}
                                sx={{
                                    color: "#dc2626",
                                    border: "1px solid #fee2e2",
                                    backgroundColor: mode === "dark" ? "rgba(239, 68, 68, 0.12)" : "#fef2f2",
                                    borderRadius: "10px",
                                    px: 1.8,
                                    py: 0.8,
                                    textTransform: "none",
                                    fontSize: "0.88rem",
                                    fontWeight: 600,
                                    "&:hover": {
                                        backgroundColor: mode === "dark" ? "rgba(239, 68, 68, 0.2)" : "#fee2e2",
                                        borderColor: "#fca5a5"
                                    }
                                }}
                            >
                                Logout
                            </Button>
                        </Tooltip>
                    </>
                ) : (
                    <>
                        <Button
                            onClick={() => navigate("/auth")}
                            sx={{
                                color: "text.primary",
                                fontWeight: 600,
                                textTransform: "none",
                                px: 2,
                                py: 0.8,
                                borderRadius: "10px",
                                "&:hover": { backgroundColor: mode === "dark" ? "rgba(255,255,255,0.05)" : "#f1f5f9" }
                            }}
                        >
                            Sign In
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => navigate("/auth")}
                            sx={{
                                backgroundColor: "#2563eb",
                                color: "#ffffff",
                                fontWeight: 700,
                                textTransform: "none",
                                px: 2.4,
                                py: 0.9,
                                borderRadius: "10px",
                                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.25)",
                                "&:hover": { backgroundColor: "#1d4ed8" }
                            }}
                        >
                            Get Started
                        </Button>
                    </>
                )}
            </Box>

            {/* Mobile Hamburger & Theme Toggle Button */}
            <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 1 }}>
                <IconButton
                    onClick={toggleTheme}
                    aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                    size="small"
                    sx={{
                        color: "text.primary",
                        borderRadius: "10px",
                        border: "1px solid",
                        borderColor: "divider",
                        p: 0.8
                    }}
                >
                    {mode === "dark" ? <LightModeIcon sx={{ fontSize: 20, color: "#f59e0b" }} /> : <DarkModeIcon sx={{ fontSize: 20, color: "#64748b" }} />}
                </IconButton>
                <IconButton
                    onClick={() => setMobileOpen(true)}
                    sx={{ color: "text.primary", p: 1 }}
                    aria-label="Open Navigation Menu"
                >
                    <MenuIcon sx={{ fontSize: 26 }} />
                </IconButton>
            </Box>

            {/* Mobile Navigation Drawer */}
            <Drawer
                anchor="right"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                PaperProps={{
                    sx: {
                        width: "280px",
                        backgroundColor: "background.paper",
                        p: 2.5,
                        display: "flex",
                        flexDirection: "column"
                    }
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box component="img" src="/video.svg" sx={{ width: 28, height: 28 }} />
                        <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                            Live<span style={{ color: "#2563eb" }}>Link</span>
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setMobileOpen(false)} sx={{ color: "#64748b" }}>
                        <CloseIcon />
                    </IconButton>
                </Box>

                {isLoggedIn && userData && (
                    <Box sx={{ p: 2, backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", mb: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar src={userData.avatar} sx={{ width: 40, height: 40 }} />
                        <Box sx={{ overflow: "hidden" }}>
                            <Typography variant="body2" fontWeight={700} color="#0f172a" noWrap>
                                {userData.name || userData.username}
                            </Typography>
                            <Typography variant="caption" color="#64748b" noWrap>
                                {userData.email || "Active User"}
                            </Typography>
                        </Box>
                    </Box>
                )}

                <Divider sx={{ mb: 2 }} />

                <List sx={{ p: 0, display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {isLoggedIn ? (
                        navItems.map((item) => (
                            <ListItem key={item.path} disablePadding>
                                <ListItemButton
                                    onClick={() => handleNavClick(item.path)}
                                    sx={{
                                        borderRadius: "10px",
                                        backgroundColor: isActive(item.path) ? "rgba(37, 99, 235, 0.08)" : "transparent",
                                        color: isActive(item.path) ? "#2563eb" : "#334155"
                                    }}
                                >
                                    <ListItemIcon sx={{ color: isActive(item.path) ? "#2563eb" : "#64748b", minWidth: 36 }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.label}
                                        primaryTypographyProps={{ fontWeight: isActive(item.path) ? 700 : 500, fontSize: "0.95rem" }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))
                    ) : (
                        <ListItem disablePadding>
                            <ListItemButton
                                onClick={() => handleNavClick("/auth")}
                                sx={{ borderRadius: "10px", color: "#2563eb", backgroundColor: "rgba(37, 99, 235, 0.08)" }}
                            >
                                <ListItemIcon sx={{ color: "#2563eb", minWidth: 36 }}>
                                    <LoginIcon />
                                </ListItemIcon>
                                <ListItemText primary="Sign In / Register" primaryTypographyProps={{ fontWeight: 700 }} />
                            </ListItemButton>
                        </ListItem>
                    )}
                </List>

                {isLoggedIn && (
                    <Box sx={{ mt: "auto", pt: 2 }}>
                        <Button
                            fullWidth
                            startIcon={<LogoutIcon />}
                            onClick={() => { setMobileOpen(false); handleLogout(); }}
                            sx={{
                                color: "#dc2626",
                                backgroundColor: "#fef2f2",
                                border: "1px solid #fee2e2",
                                borderRadius: "10px",
                                py: 1,
                                textTransform: "none",
                                fontWeight: 700
                            }}
                        >
                            Logout
                        </Button>
                    </Box>
                )}
            </Drawer>
        </Box>
    );
}
