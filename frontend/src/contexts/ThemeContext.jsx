import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createAppTheme } from "../theme";
import { AuthContext } from "./AuthContext";

export const ThemeModeContext = createContext({
  mode: "light",
  toggleTheme: () => {},
  setMode: () => {}
});

export const useThemeMode = () => useContext(ThemeModeContext);

export function ThemeCustomProvider({ children }) {
  const { userData, updatePreferences } = useContext(AuthContext);

  const [mode, setModeState] = useState(() => {
    const saved = localStorage.getItem("livelink_theme");
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  // Sync with user preferences if available from DB
  useEffect(() => {
    if (userData?.preferences?.theme) {
      const dbTheme = userData.preferences.theme;
      if (dbTheme === "dark" || dbTheme === "light") {
        setModeState(dbTheme);
        localStorage.setItem("livelink_theme", dbTheme);
      }
    }
  }, [userData?.preferences?.theme]);

  const setMode = useCallback((newMode) => {
    setModeState(newMode);
    localStorage.setItem("livelink_theme", newMode);
    if (updatePreferences && localStorage.getItem("token")) {
      updatePreferences({ theme: newMode }).catch((e) => {
        console.warn("Could not sync theme preference to DB:", e);
      });
    }
  }, [updatePreferences]);

  const toggleTheme = useCallback(() => {
    const nextMode = mode === "light" ? "dark" : "light";
    setMode(nextMode);
  }, [mode, setMode]);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const contextValue = useMemo(() => ({
    mode,
    toggleTheme,
    setMode
  }), [mode, toggleTheme, setMode]);

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
