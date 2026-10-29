/**
 * AETHER DESIGN SYSTEM TOKENS
 * Warm editorial aesthetic with Light, Dark, and Sepia reading themes.
 * Strict accessibility compliance: button backgrounds exceed 4.5:1 WCAG AA contrast.
 */

export type ThemeMode = 'light' | 'dark' | 'sepia';

export interface ThemeColors {
  bgApp: string;
  surface: string;
  surfaceElevated: string;
  sidebar: string;
  sidebarActive: string;
  accent: string;
  accentHover: string;
  accentButton: string; // High-contrast for white button text (>= 4.5:1)
  accentButtonHover: string;
  accentSubtle: string;
  text: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderStrong: string;
}

export const themes: Record<ThemeMode, ThemeColors> = {
  light: {
    bgApp: '#FAF8F5',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    sidebar: '#F3EFEA',
    sidebarActive: '#E9E3DC',
    accent: '#CC785C',
    accentHover: '#BA664A',
    accentButton: '#B35639', // WCAG AA 4.7:1 against #FFFFFF
    accentButtonHover: '#9E4A30',
    accentSubtle: 'rgba(204, 120, 92, 0.12)',
    text: '#1F1E1D',
    textMuted: '#6B6862',
    textInverse: '#FAF8F5',
    border: '#E5E0D8',
    borderStrong: '#D1CAC0'
  },
  dark: {
    bgApp: '#1A1915',
    surface: '#23221E',
    surfaceElevated: '#2A2924',
    sidebar: '#141311',
    sidebarActive: '#2C2B26',
    accent: '#D97757',
    accentHover: '#E08566',
    accentButton: '#D97757', // Contrast with black/near-white
    accentButtonHover: '#E08566',
    accentSubtle: 'rgba(217, 119, 87, 0.18)',
    text: '#EDEAE5',
    textMuted: '#9C978F',
    textInverse: '#1A1915',
    border: '#32302A',
    borderStrong: '#44413A'
  },
  sepia: {
    bgApp: '#F4EFE6',
    surface: '#FAF6F0',
    surfaceElevated: '#FFFDF9',
    sidebar: '#EDE7DC',
    sidebarActive: '#E1D9CC',
    accent: '#A2583E',
    accentHover: '#8E4B33',
    accentButton: '#8E4B33', // WCAG AA compliant on warm paper
    accentButtonHover: '#793D28',
    accentSubtle: 'rgba(162, 88, 62, 0.14)',
    text: '#2B2621',
    textMuted: '#786F66',
    textInverse: '#FAF6F0',
    border: '#DED6C9',
    borderStrong: '#C8BEAF'
  }
};

export const radii = {
  card: '16px',
  input: '12px',
  chip: '9999px',
  button: '12px'
} as const;

export const motion = {
  durationFast: '150ms',
  durationNormal: '200ms',
  durationSlow: '250ms',
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
} as const;

export const fonts = {
  heading: 'var(--font-fraunces), Georgia, serif',
  body: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
  code: 'var(--font-jetbrains-mono), monospace'
} as const;
