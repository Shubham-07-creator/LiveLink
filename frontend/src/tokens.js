/**
 * LiveLink Strict Design System Tokens
 * Reference file for all visual values across the application.
 * No hardcoded colors, spacing or font sizes should be used outside this file.
 */

export const tokens = {
  colors: {
    light: {
      bg: "#f8fafc",
      surface: "#ffffff",
      border: "#e2e8f0",
      textHeading: "#0f172a",
      textBody: "#334155",
      textMuted: "#64748b",
      placeholder: "#94a3b8",
      primary: "#2563eb",
      primaryHover: "#1d4ed8",
      primaryPressed: "#1e40af",
      primarySoftBg: "#eff6ff",
      primarySoftBorder: "#bfdbfe",
      danger: "#dc2626",
      dangerHover: "#b91c1c",
      dangerSoftBg: "#fee2e2",
      success: "#15803d",
      successSoftBg: "#dcfce7",
      warning: "#b45309",
      warningText: "#b45309",
      warningSoftBg: "#fef3c7",
      shadow: "0 1px 3px rgba(0,0,0,0.05), 0 10px 25px -5px rgba(0,0,0,0.04)",
      cardShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
      modalShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
    },
    dark: {
      bg: "#0b1020",
      surface: "#111827",
      border: "#1f2937",
      textHeading: "#f1f5f9",
      textBody: "#cbd5e1",
      textMuted: "#94a3b8",
      placeholder: "#64748b",
      primary: "#3b82f6",
      primaryHover: "#60a5fa",
      primaryPressed: "#2563eb",
      primarySoftBg: "rgba(59, 130, 246, 0.15)",
      primarySoftBorder: "rgba(59, 130, 246, 0.3)",
      danger: "#dc2626",
      dangerHover: "#b91c1c",
      dangerSoftBg: "rgba(220, 38, 38, 0.15)",
      success: "#15803d",
      successSoftBg: "rgba(21, 128, 61, 0.15)",
      warning: "#f59e0b",
      warningText: "#f59e0b",
      warningSoftBg: "rgba(245, 158, 11, 0.15)",
      shadow: "none",
      cardShadow: "none",
      modalShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)"
    },
    // Call screen is always dark, in both themes
    call: {
      stageBg: "#090d16",
      tileBg: "#111827",
      dockBg: "rgba(15, 23, 42, 0.80)",
      dockBorder: "rgba(255, 255, 255, 0.08)",
      dockIconNormal: "rgba(255, 255, 255, 0.10)",
      dockIconHover: "rgba(255, 255, 255, 0.16)",
      offState: "#dc2626",
      offStateHover: "#b91c1c",
      activeSpeaker: "#22c55e",
      activeSpeakerGlow: "0 0 12px rgba(34, 197, 94, 0.45)",
      leaveBtn: "#dc2626",
      leaveBtnHover: "#b91c1c",
      raiseHandBg: "#f59e0b",
      raiseHandColor: "#0f172a"
    },
    // Status dots and small badges only (never for white-text buttons)
    accent: {
      dotRed: "#ef4444",
      dotGreen: "#16a34a",
      dotAmber: "#f59e0b"
    }
  },
  spacing: {
    scale: [4, 8, 12, 16, 24, 32, 48, 64, 96],
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    "2xl": 48,
    "3xl": 64,
    "4xl": 96
  },
  radii: {
    card: "20px",
    tile: "16px",
    button: "12px",
    input: "12px",
    badge: "999px",
    modal: "24px"
  },
  buttonHeights: {
    large: "48px",
    normal: "40px",
    small: "32px",
    minTouch: "44px"
  },
  typography: {
    fonts: {
      heading: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    },
    hero: {
      desktop: "56px",
      mobile: "36px",
      weight: 800,
      lineHeight: 1.1,
      letterSpacing: "-0.03em"
    },
    pageTitle: {
      desktop: "32px",
      mobile: "26px",
      weight: 700,
      lineHeight: 1.2
    },
    sectionTitle: {
      desktop: "24px",
      mobile: "20px",
      weight: 700
    },
    cardTitle: {
      fontSize: "18px",
      weight: 600
    },
    body: {
      fontSize: "16px",
      weight: 400,
      lineHeight: 1.6,
      maxWidth: "560px"
    },
    button: {
      fontSize: "15px",
      weight: 600,
      letterSpacing: "0"
    },
    input: {
      fontSize: "16px",
      weight: 400
    },
    label: {
      fontSize: "14px",
      weight: 500
    },
    caption: {
      fontSize: "13px",
      weight: 400
    },
    tileName: {
      fontSize: "13px",
      weight: 500,
      color: "#ffffff"
    }
  },
  motion: {
    micro: "150ms ease",
    modal: "250ms cubic-bezier(0.16, 1, 0.3, 1)",
    toast: "200ms ease-out",
    reduced: "0.01ms"
  }
};

/**
 * Returns theme-specific palette and common tokens
 */
export const getTokens = (mode = "light") => {
  let resolved = "light";
  if (mode === "dark") {
    resolved = "dark";
  } else if (mode === "system") {
    if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      resolved = "dark";
    } else {
      resolved = "light";
    }
  } else if (mode === "light") {
    resolved = "light";
  }

  const isDark = resolved === "dark";
  const modeColors = isDark ? (tokens?.colors?.dark || {}) : (tokens?.colors?.light || {});
  const lightColors = tokens?.colors?.light || {};
  const darkColors = tokens?.colors?.dark || {};

  return {
    mode: resolved,
    isDark,
    colors: {
      ...modeColors,
      light: lightColors,
      dark: darkColors,
      call: tokens?.colors?.call || {},
      accent: tokens?.colors?.accent || {},
      shadow: modeColors?.shadow || (isDark ? "none" : "0 1px 3px rgba(0,0,0,0.05), 0 10px 25px -5px rgba(0,0,0,0.04)"),
      cardShadow: modeColors?.cardShadow || "none",
      modalShadow: modeColors?.modalShadow || (isDark ? "0 20px 25px -5px rgba(0, 0, 0, 0.5)" : "0 25px 50px -12px rgba(0, 0, 0, 0.25)")
    },
    raw: tokens,
    light: lightColors,
    dark: darkColors,
    call: tokens?.colors?.call || {},
    accent: tokens?.colors?.accent || {},
    spacing: tokens?.spacing || [0, 4, 8, 12, 16, 24, 32, 48, 64, 96],
    radii: tokens?.radii || { card: "20px", tile: "16px", button: "12px", badge: "999px", modal: "24px", input: "12px" },
    buttonHeights: tokens?.buttonHeights || { small: "32px", normal: "40px", large: "48px", minTouch: "44px" },
    typography: tokens?.typography || {},
    motion: tokens?.motion || { micro: "150ms ease", modal: "250ms ease", toast: "200ms ease-out", reduced: "0.01ms" }
  };
};

export default tokens;
