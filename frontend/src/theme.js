import { createTheme } from "@mui/material/styles";
import { tokens, getTokens } from "./tokens";

/**
 * Central MUI Theme Configuration for LiveLink
 * Derived directly from strict Design System tokens in tokens.js.
 */
export const createAppTheme = (mode = "light") => {
  const t = getTokens(mode);
  const c = t.colors;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: c.primary,
        dark: c.primaryHover,
        light: c.primaryHover,
        contrastText: "#ffffff"
      },
      error: {
        main: c.danger,
        dark: c.dangerHover,
        contrastText: "#ffffff"
      },
      success: {
        main: c.success,
        contrastText: "#ffffff"
      },
      warning: {
        main: c.warningText,
        contrastText: t.isDark ? "#ffffff" : "#0f172a"
      },
      background: {
        default: c.bg,
        paper: c.surface,
        stage: t.call.stageBg
      },
      text: {
        primary: c.textHeading,
        secondary: c.textBody,
        heading: c.textHeading,
        muted: c.textMuted
      },
      divider: c.border
    },
    shape: {
      borderRadius: 12
    },
    spacing: 8, // MUI theme.spacing(1) = 8px, (0.5) = 4px, (1.5) = 12px, (2) = 16px, (3) = 24px, (4) = 32px, (6) = 48px, (8) = 64px, (12) = 96px
    typography: {
      fontFamily: t.typography.fonts.body,
      h1: {
        fontFamily: t.typography.fonts.heading,
        fontWeight: t.typography.hero.weight,
        fontSize: t.typography.hero.desktop,
        lineHeight: t.typography.hero.lineHeight,
        letterSpacing: t.typography.hero.letterSpacing,
        color: c.textHeading,
        "@media (max-width:600px)": {
          fontSize: t.typography.hero.mobile
        }
      },
      h2: {
        fontFamily: t.typography.fonts.heading,
        fontWeight: t.typography.pageTitle.weight,
        fontSize: t.typography.pageTitle.desktop,
        lineHeight: t.typography.pageTitle.lineHeight,
        color: c.textHeading,
        "@media (max-width:600px)": {
          fontSize: t.typography.pageTitle.mobile
        }
      },
      h3: {
        fontFamily: t.typography.fonts.heading,
        fontWeight: t.typography.sectionTitle.weight,
        fontSize: t.typography.sectionTitle.desktop,
        color: c.textHeading,
        "@media (max-width:600px)": {
          fontSize: t.typography.sectionTitle.mobile
        }
      },
      h4: {
        fontFamily: t.typography.fonts.heading,
        fontWeight: 700,
        fontSize: "20px",
        color: c.textHeading
      },
      h5: {
        fontFamily: t.typography.fonts.heading,
        fontWeight: t.typography.cardTitle.weight,
        fontSize: t.typography.cardTitle.fontSize,
        color: c.textHeading
      },
      h6: {
        fontFamily: t.typography.fonts.heading,
        fontWeight: 600,
        fontSize: "16px",
        color: c.textHeading
      },
      subtitle1: {
        fontFamily: t.typography.fonts.body,
        fontWeight: 600,
        fontSize: "16px",
        color: c.textHeading
      },
      subtitle2: {
        fontFamily: t.typography.fonts.body,
        fontWeight: t.typography.label.weight,
        fontSize: t.typography.label.fontSize,
        color: c.textMuted
      },
      body1: {
        fontFamily: t.typography.fonts.body,
        fontWeight: t.typography.body.weight,
        fontSize: t.typography.body.fontSize,
        lineHeight: t.typography.body.lineHeight,
        color: c.textBody
      },
      body2: {
        fontFamily: t.typography.fonts.body,
        fontWeight: 400,
        fontSize: "14px",
        lineHeight: 1.5,
        color: c.textMuted
      },
      button: {
        fontFamily: t.typography.fonts.body,
        fontWeight: t.typography.button.weight,
        fontSize: t.typography.button.fontSize,
        textTransform: "none",
        letterSpacing: t.typography.button.letterSpacing
      },
      caption: {
        fontFamily: t.typography.fonts.body,
        fontWeight: t.typography.caption.weight,
        fontSize: t.typography.caption.fontSize,
        color: c.textMuted
      }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: c.bg,
            color: c.textBody,
            fontFamily: t.typography.fonts.body,
            transition: `background-color ${t.motion.micro}, color ${t.motion.micro}`
          },
          ":focus-visible": {
            outline: `2px solid ${c.primary}`,
            outlineOffset: "2px"
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*": {
              animationDuration: `${t.motion.reduced} !important`,
              transitionDuration: `${t.motion.reduced} !important`
            }
          }
        }
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0
        },
        styleOverrides: {
          root: {
            borderRadius: t.radii.card,
            border: `1px solid ${c.border}`,
            backgroundColor: c.surface,
            backgroundImage: "none",
            boxShadow: c.cardShadow,
            transition: `background-color ${t.motion.micro}, border-color ${t.motion.micro}, box-shadow ${t.motion.micro}`
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: t.radii.card,
            border: `1px solid ${c.border}`,
            backgroundColor: c.surface,
            boxShadow: c.cardShadow
          }
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true
        },
        styleOverrides: {
          root: {
            borderRadius: t.radii.button,
            textTransform: "none",
            fontWeight: t.typography.button.weight,
            fontSize: t.typography.button.fontSize,
            minHeight: t.buttonHeights.normal,
            padding: "8px 16px",
            transition: `all ${t.motion.micro}`,
            "&:focus-visible": {
              outline: `2px solid ${c.primary}`,
              outlineOffset: "2px"
            }
          },
          sizeLarge: {
            minHeight: t.buttonHeights.large,
            padding: "12px 24px"
          },
          sizeSmall: {
            minHeight: t.buttonHeights.small,
            padding: "4px 12px"
          },
          containedPrimary: {
            backgroundColor: c.primary,
            color: "#ffffff",
            "&:hover": {
              backgroundColor: c.primaryHover
            },
            "&:active": {
              backgroundColor: c.primaryPressed
            }
          },
          containedError: {
            backgroundColor: c.danger,
            color: "#ffffff",
            "&:hover": {
              backgroundColor: c.dangerHover
            }
          },
          containedSuccess: {
            backgroundColor: c.success,
            color: "#ffffff"
          },
          outlinedPrimary: {
            borderColor: t.isDark ? c.primary : c.border,
            color: c.primary,
            "&:hover": {
              borderColor: c.primaryHover,
              backgroundColor: c.primarySoftBg
            }
          }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: t.radii.button,
            transition: `all ${t.motion.micro}`,
            minWidth: t.buttonHeights.minTouch,
            minHeight: t.buttonHeights.minTouch,
            "&:focus-visible": {
              outline: `2px solid ${c.primary}`,
              outlineOffset: "2px"
            }
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: t.radii.modal,
            border: `1px solid ${c.border}`,
            backgroundColor: c.surface,
            boxShadow: c.modalShadow
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: t.radii.badge,
            fontSize: t.typography.caption.fontSize
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: t.radii.input,
            backgroundColor: c.surface,
            fontSize: t.typography.input.fontSize,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: c.border
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: c.primary
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: c.primary,
              borderWidth: "2px"
            }
          },
          input: {
            padding: "10px 14px",
            fontSize: t.typography.input.fontSize,
            color: c.textHeading,
            "&::placeholder": {
              color: c.placeholder,
              opacity: 1
            }
          }
        }
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: `${t.radii.card} !important`,
            border: `1px solid ${c.border}`,
            backgroundColor: c.surface,
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

export { tokens, getTokens };
