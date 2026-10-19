import { createTheme } from "@mui/material/styles";

/**
 * Central MUI Theme Configuration for LiveLink
 * 
 * Rules & Requirements:
 * - Primary: #2563eb (hover: #1d4ed8), Danger: #ef4444, Success: #16a34a
 * - Call stage background: #090d16, Heading text: #0f172a, Muted text: #64748b
 * - Fonts: Plus Jakarta Sans for headings (700/800), Inter for body
 * - Border radius: cards 16-20px, buttons 10-12px, control dock 24px
 * - Accessible contrast (>= 4.5:1), visible focus rings, aria-labels
 */
export const createAppTheme = (mode = "light") => {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#2563eb",
        dark: "#1d4ed8",
        light: "#60a5fa",
        contrastText: "#ffffff"
      },
      error: {
        main: "#ef4444",
        dark: "#dc2626",
        light: "#f87171",
        contrastText: "#ffffff"
      },
      success: {
        main: "#16a34a",
        dark: "#15803d",
        light: "#4ade80",
        contrastText: "#ffffff"
      },
      warning: {
        main: "#f59e0b",
        dark: "#d97706",
        light: "#fbbf24",
        contrastText: "#0f172a"
      },
      background: {
        default: isDark ? "#0b0f19" : "#f8fafc",
        paper: isDark ? "#111827" : "#ffffff",
        stage: "#090d16" // Dedicated call stage background
      },
      text: {
        primary: isDark ? "#f8fafc" : "#0f172a",
        secondary: isDark ? "#94a3b8" : "#64748b",
        heading: isDark ? "#f8fafc" : "#0f172a",
        muted: isDark ? "#94a3b8" : "#64748b"
      },
      divider: isDark ? "#1f2937" : "#e2e8f0"
    },
    shape: {
      borderRadius: 12
    },
    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      h1: {
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800,
        color: isDark ? "#f8fafc" : "#0f172a",
        letterSpacing: "-0.025em"
      },
      h2: {
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800,
        color: isDark ? "#f8fafc" : "#0f172a",
        letterSpacing: "-0.02em"
      },
      h3: {
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800,
        color: isDark ? "#f8fafc" : "#0f172a",
        letterSpacing: "-0.02em"
      },
      h4: {
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800,
        color: isDark ? "#f8fafc" : "#0f172a",
        letterSpacing: "-0.015em"
      },
      h5: {
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 800,
        color: isDark ? "#f8fafc" : "#0f172a",
        letterSpacing: "-0.01em"
      },
      h6: {
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 700,
        color: isDark ? "#f8fafc" : "#0f172a"
      },
      subtitle1: {
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        color: isDark ? "#e2e8f0" : "#334155"
      },
      subtitle2: {
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        color: isDark ? "#94a3b8" : "#475569"
      },
      body1: {
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1.6,
        color: isDark ? "#cbd5e1" : "#334155"
      },
      body2: {
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1.55,
        color: isDark ? "#94a3b8" : "#64748b"
      },
      button: {
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        textTransform: "none"
      },
      caption: {
        fontFamily: "'Inter', sans-serif",
        color: isDark ? "#94a3b8" : "#64748b"
      }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? "#0b0f19" : "#f8fafc",
            color: isDark ? "#f8fafc" : "#0f172a",
            transition: "background-color 0.2s ease, color 0.2s ease"
          },
          ":focus-visible": {
            outline: "2px solid #2563eb",
            outlineOffset: "2px"
          }
        }
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0
        },
        styleOverrides: {
          root: {
            borderRadius: "18px", // cards 16-20px
            border: `1px solid ${isDark ? "#1f2937" : "#e2e8f0"}`,
            backgroundColor: isDark ? "#111827" : "#ffffff",
            backgroundImage: "none",
            transition: "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease"
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: "18px",
            border: `1px solid ${isDark ? "#1f2937" : "#e2e8f0"}`,
            backgroundColor: isDark ? "#111827" : "#ffffff"
          }
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true
        },
        styleOverrides: {
          root: {
            borderRadius: "10px", // buttons 10-12px
            textTransform: "none",
            fontWeight: 700,
            padding: "8px 18px",
            fontSize: "0.92rem",
            transition: "all 0.15s ease",
            "&:focus-visible": {
              outline: "2px solid #2563eb",
              outlineOffset: "2px"
            }
          },
          containedPrimary: {
            backgroundColor: "#2563eb",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#1d4ed8"
            }
          },
          containedError: {
            backgroundColor: "#ef4444",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#dc2626"
            }
          },
          containedSuccess: {
            backgroundColor: "#16a34a",
            color: "#ffffff",
            "&:hover": {
              backgroundColor: "#15803d"
            }
          },
          outlinedPrimary: {
            borderColor: isDark ? "#2563eb" : "#cbd5e1",
            color: isDark ? "#60a5fa" : "#2563eb",
            "&:hover": {
              borderColor: "#2563eb",
              backgroundColor: isDark ? "rgba(37, 99, 235, 0.15)" : "rgba(37, 99, 235, 0.05)"
            }
          }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: "10px",
            transition: "all 0.15s ease",
            "&:focus-visible": {
              outline: "2px solid #2563eb",
              outlineOffset: "2px"
            }
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: "20px",
            border: `1px solid ${isDark ? "#1f2937" : "#e2e8f0"}`,
            backgroundColor: isDark ? "#111827" : "#ffffff"
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            borderRadius: "8px"
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: "10px",
            backgroundColor: isDark ? "#0f172a" : "#ffffff",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: isDark ? "#334155" : "#cbd5e1"
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#2563eb"
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#2563eb",
              borderWidth: "2px"
            }
          }
        }
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: "14px !important",
            border: `1px solid ${isDark ? "#1f2937" : "#e2e8f0"}`,
            backgroundColor: isDark ? "#111827" : "#ffffff",
            marginBottom: "12px",
            "&:before": {
              display: "none"
            }
          }
        }
      }
    }
  });
};
