import { describe, it, expect, vi } from 'vitest';
import tokens, { getTokens } from '../../frontend/src/tokens.js';
import { createAppTheme } from '../../frontend/src/theme.js';

describe('Design Tokens & Theme Resolver', () => {
  describe('getTokens', () => {
    it('resolves light mode tokens cleanly', () => {
      const t = getTokens('light');
      expect(t.mode).toBe('light');
      expect(t.isDark).toBe(false);
      expect(t.colors.bg).toBe('#f0f4f8');
      expect(t.colors.surface).toBe('#ffffff');
      expect(t.colors.shadow).toBeDefined();
      expect(typeof t.colors.shadow).toBe('string');
      expect(t.colors.shadow.length).toBeGreaterThan(0);
    });

    it('resolves dark mode tokens cleanly', () => {
      const t = getTokens('dark');
      expect(t.mode).toBe('dark');
      expect(t.isDark).toBe(true);
      expect(t.colors.bg).toBe('#0b1020');
      expect(t.colors.surface).toBe('#111827');
      expect(t.colors.shadow).toBeDefined();
    });

    it('resolves system mode based on prefers-color-scheme matchMedia', () => {
      // Mock window.matchMedia for dark scheme
      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const tDark = getTokens('system');
      expect(tDark.mode).toBe('dark');
      expect(tDark.isDark).toBe(true);

      // Mock window.matchMedia for light scheme
      vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const tLight = getTokens('system');
      expect(tLight.mode).toBe('light');
      expect(tLight.isDark).toBe(false);
    });

    it('never returns undefined for missing, null, or invalid theme values', () => {
      const invalidInputs = [undefined, null, '', 'invalid-mode', 123, {}, []];
      for (const input of invalidInputs) {
        const t = getTokens(input);
        expect(t).toBeDefined();
        expect(t.mode).toBeDefined();
        expect(['light', 'dark']).toContain(t.mode);
        expect(t.colors).toBeDefined();
        expect(t.colors.primary).toBeDefined();
        expect(t.colors.shadow).toBeDefined();
      }
    });

    it('regression test: ensures shadow property is never undefined (guards Toast.jsx crash)', () => {
      // Previously caused: "Cannot read properties of undefined (reading 'shadow')"
      const lightTokens = getTokens('light');
      expect(lightTokens.colors.shadow).toBeDefined();
      expect(lightTokens.colors.shadow).not.toBe('');

      const darkTokens = getTokens('dark');
      expect(darkTokens.colors.shadow).toBeDefined();

      const defaultTokens = getTokens();
      expect(defaultTokens.colors.shadow).toBeDefined();

      // Ensure root raw token structure is intact
      expect(tokens.colors).toBeDefined();
      expect(tokens.colors.light.shadow).toBeDefined();
    });
  });

  describe('createAppTheme', () => {
    it('creates a valid MUI theme object in light mode', () => {
      const theme = createAppTheme('light');
      expect(theme).toBeDefined();
      expect(theme.palette.mode).toBe('light');
      expect(theme.palette.primary.main).toBe(tokens.colors.light.primary);
      expect(theme.palette.background.default).toBe(tokens.colors.light.bg);
    });

    it('creates a valid MUI theme object in dark mode', () => {
      const theme = createAppTheme('dark');
      expect(theme).toBeDefined();
      expect(theme.palette.mode).toBe('dark');
      expect(theme.palette.primary.main).toBe(tokens.colors.dark.primary);
      expect(theme.palette.background.default).toBe(tokens.colors.dark.bg);
    });

    it('falls back gracefully to light theme for null or undefined input', () => {
      const themeNull = createAppTheme(null);
      expect(themeNull.palette.mode).toBe('light');

      const themeUndefined = createAppTheme(undefined);
      expect(themeUndefined.palette.mode).toBe('light');
    });
  });
});
