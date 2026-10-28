import React, { useContext, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { useThemeMode } from "../contexts/ThemeContext";
import { Button, IconButton, Chip } from "./ui";

import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData, handleLogout } = useContext(AuthContext);
  const themeContext = useThemeMode();
  const isDark = Boolean(themeContext?.isDark);
  const tokens = themeContext?.tokens || {};
  const toggleTheme = themeContext?.toggleTheme;
  const c = tokens?.colors || {};
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const token = localStorage.getItem("token");
  const isLoggedIn = Boolean(userData || token);

  const navItems = [
    { label: "Dashboard", path: "/home", icon: <DashboardOutlinedIcon sx={{ fontSize: 20 }} /> },
    { label: "History", path: "/history", icon: <HistoryOutlinedIcon sx={{ fontSize: 20 }} /> },
    { label: "Settings", path: "/profile", icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 20 }} /> }
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
        height: "68px",
        backgroundColor: isDark ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${c.border}`,
        position: "sticky",
        top: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: { xs: 2, sm: 4 },
        boxShadow: isDark ? "none" : c.cardShadow
      }}
    >
      {/* Left: Brand Logo */}
      <Box
        onClick={() => navigate(isLoggedIn ? "/home" : "/")}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          cursor: "pointer",
          userSelect: "none"
        }}
      >
        <Box
          component="img"
          src="/video.svg"
          alt="LiveLink"
          sx={{ width: 34, height: 34 }}
        />
        <Typography
          variant="h5"
          sx={{
            fontFamily: tokens.typography.fonts.heading,
            fontWeight: 800,
            color: c.textHeading,
            letterSpacing: "-0.03em"
          }}
        >
          Live<Box component="span" sx={{ color: c.primary }}>Link</Box>
        </Typography>
      </Box>

      {/* Center Desktop Navigation Links */}
      {isLoggedIn && (
        <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1 }}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Button
                key={item.path}
                variant={active ? "primary" : "ghost"}
                size="small"
                onClick={() => handleNavClick(item.path)}
                leftIcon={item.icon}
                sx={{
                  color: active ? "#ffffff" : c.textHeading,
                  bgcolor: active ? c.primary : "transparent"
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>
      )}

      {/* Right Desktop Actions */}
      <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1.5 }}>
        {/* Light/Dark Toggle */}
        <IconButton
          tooltip={isDark ? "Switch to light mode" : "Switch to dark mode"}
          variant="default"
          size="normal"
          onClick={toggleTheme}
          ariaLabel="Toggle theme"
        >
          {isDark ? (
            <LightModeOutlinedIcon sx={{ color: tokens?.accent?.dotAmber || tokens?.colors?.accent?.dotAmber || "#f59e0b" }} />
          ) : (
            <DarkModeOutlinedIcon sx={{ color: c.textMuted }} />
          )}
        </IconButton>

        {isLoggedIn ? (
          <>
            {userData && (
              <Chip
                icon={
                  <Avatar
                    src={userData.avatar}
                    alt={userData.name}
                    sx={{ width: 24, height: 24, fontSize: "11px" }}
                  />
                }
                label={userData.name || userData.username || "Account"}
                onClick={() => navigate("/profile")}
              />
            )}

            <Button
              variant="ghost"
              size="normal"
              onClick={handleLogout}
              leftIcon={<LogoutOutlinedIcon />}
            >
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="normal"
              onClick={() => navigate("/auth")}
            >
              Sign in
            </Button>
            <Button
              variant="primary"
              size="normal"
              onClick={() => navigate("/auth")}
            >
              Get started
            </Button>
          </>
        )}
      </Box>

      {/* Mobile Hamburger & Theme Toggle Button */}
      <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", gap: 1 }}>
        <IconButton
          tooltip={isDark ? "Switch to light mode" : "Switch to dark mode"}
          variant="default"
          size="normal"
          onClick={toggleTheme}
          ariaLabel="Toggle theme"
        >
          {isDark ? (
            <LightModeOutlinedIcon sx={{ color: tokens?.accent?.dotAmber || tokens?.colors?.accent?.dotAmber || "#f59e0b" }} />
          ) : (
            <DarkModeOutlinedIcon sx={{ color: c.textMuted }} />
          )}
        </IconButton>
        <IconButton
          variant="default"
          size="normal"
          onClick={() => setMobileOpen(true)}
          ariaLabel="Open navigation menu"
        >
          <MenuOutlinedIcon />
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
            backgroundColor: c.surface,
            color: c.textHeading,
            borderLeft: `1px solid ${c.border}`,
            p: 2.5,
            display: "flex",
            flexDirection: "column"
          }
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box component="img" src="/video.svg" sx={{ width: 28, height: 28 }} />
            <Typography variant="subtitle1" fontWeight={800} color={c.textHeading}>
              Live<Box component="span" sx={{ color: c.primary }}>Link</Box>
            </Typography>
          </Box>
          <IconButton size="small" variant="ghost" onClick={() => setMobileOpen(false)}>
            <CloseOutlinedIcon />
          </IconButton>
        </Box>

        {isLoggedIn && userData && (
          <Box
            sx={{
              p: 2,
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : c.primarySoftBg,
              borderRadius: tokens.radii.button,
              border: `1px solid ${c.border}`,
              mb: 2,
              display: "flex",
              alignItems: "center",
              gap: 1.5
            }}
          >
            <Avatar src={userData.avatar} sx={{ width: 40, height: 40 }} />
            <Box sx={{ overflow: "hidden" }}>
              <Typography variant="body2" fontWeight={700} color={c.textHeading} noWrap>
                {userData.name || userData.username}
              </Typography>
              <Typography variant="caption" color={c.textMuted} noWrap>
                {userData.email || "Active User"}
              </Typography>
            </Box>
          </Box>
        )}

        <List sx={{ flexGrow: 1, py: 0 }}>
          {isLoggedIn ? (
            <>
              {navItems.map((item) => (
                <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => handleNavClick(item.path)}
                    sx={{
                      borderRadius: tokens.radii.button,
                      backgroundColor: isActive(item.path) ? c.primarySoftBg : "transparent",
                      color: isActive(item.path) ? c.primary : c.textHeading
                    }}
                  >
                    <ListItemIcon sx={{ color: isActive(item.path) ? c.primary : c.textMuted, minWidth: 36 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600, fontSize: "14px" }} />
                  </ListItemButton>
                </ListItem>
              ))}

              <Divider sx={{ my: 2, borderColor: c.border }} />

              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  sx={{ borderRadius: tokens.radii.button, color: c.danger }}
                >
                  <ListItemIcon sx={{ color: c.danger, minWidth: 36 }}>
                    <LogoutOutlinedIcon sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText primary="Sign out" primaryTypographyProps={{ fontWeight: 600, fontSize: "14px" }} />
                </ListItemButton>
              </ListItem>
            </>
          ) : (
            <>
              <ListItem disablePadding sx={{ mb: 1 }}>
                <ListItemButton onClick={() => handleNavClick("/auth")} sx={{ borderRadius: tokens.radii.button }}>
                  <ListItemText primary="Sign in" primaryTypographyProps={{ fontWeight: 600 }} />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleNavClick("/auth")} sx={{ borderRadius: tokens.radii.button, bgcolor: c.primary, color: "#ffffff" }}>
                  <ListItemText primary="Get started" primaryTypographyProps={{ fontWeight: 700 }} />
                </ListItemButton>
              </ListItem>
            </>
          )}
        </List>
      </Drawer>
    </Box>
  );
}
