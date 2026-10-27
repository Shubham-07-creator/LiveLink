import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createAppTheme } from "../theme";
import { getTokens } from "../tokens";
import { AuthContext } from "./AuthContext";
import { ToastProvider } from "./ToastContext";

/**
 * Resolves any preference value to strictly "light" or "dark"
 * - "dark" -> "dark"
 * - "light" -> "light"
 * - "system" -> reads window.matchMedia("(prefers-color-scheme: dark)")
 * - Missing / null / undefined / invalid string -> strictly falls back to "light"
 */
export const resolveMode = (pref) => {
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  if (pref === "system") {
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }
  return "light";
};

export const ThemeModeContext = createContext({
  preference: "system",
  mode: "light",
  resolvedMode: "light",
  isDark: false,
  tokens: getTokens("light"),
  toggleTheme: () => {},
  setMode: () => {},
  setPreference: () => {}
});

export const useThemeMode = () => useContext(ThemeModeContext);

export function ThemeCustomProvider({ children }) {
  const { userData, updatePreferences } = useContext(AuthContext);

  // Preference can be "light", "dark", or "system"
  const [preference, setPreferenceState] = useState(() => {
    try {
      const saved = localStorage.getItem("livelink_theme");
      if (saved === "light" || saved === "dark" || saved === "system") return saved;
    } catch (_) {}
    return "system";
  });

  // Track system preference changes via matchMedia
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setSystemPrefersDark(Boolean(e.matches));
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Sync with user preferences if available from DB
  useEffect(() => {
    const dbTheme = userData?.preferences?.theme;
    if (dbTheme === "dark" || dbTheme === "light" || dbTheme === "system") {
      setPreferenceState(dbTheme);
      try {
        localStorage.setItem("livelink_theme", dbTheme);
      } catch (_) {}
    }
  }, [userData?.preferences?.theme]);

  // Resolve preference BEFORE it reaches theme or tokens
  // GUARANTEED to ONLY EVER be "light" or "dark"
  const resolvedMode = useMemo(() => {
    if (preference === "dark") return "dark";
    if (preference === "light") return "light";
    if (preference === "system") {
      return systemPrefersDark ? "dark" : "light";
    }
    // Missing or invalid -> strictly "light"
    return "light";
  }, [preference, systemPrefersDark]);

  const setMode = useCallback((newPref) => {
    // Valid values are "light", "dark", or "system". Anything else falls back to "light".
    const validPref = (newPref === "dark" || newPref === "light" || newPref === "system") ? newPref : "light";
    setPreferenceState(validPref);
    try {
      localStorage.setItem("livelink_theme", validPref);
    } catch (_) {}
    if (updatePreferences && localStorage.getItem("token")) {
      updatePreferences({ theme: validPref }).catch((e) => {
        console.warn("Could not sync theme preference to DB:", e);
      });
    }
  }, [updatePreferences]);

  const toggleTheme = useCallback(() => {
    const nextMode = resolvedMode === "light" ? "dark" : "light";
    setMode(nextMode);
  }, [resolvedMode, setMode]);

  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);
  const currentTokens = useMemo(() => getTokens(resolvedMode), [resolvedMode]);

  const contextValue = useMemo(() => ({
    preference,
    mode: resolvedMode, // Always strictly "light" or "dark"
    resolvedMode,
    isDark: resolvedMode === "dark",
    tokens: currentTokens,
    toggleTheme,
    setMode,
    setPreference: setMode
  }), [preference, resolvedMode, currentTokens, toggleTheme, setMode]);

  return (
    <ThemeModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
