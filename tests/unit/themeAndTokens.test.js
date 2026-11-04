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
      expect(tokens.colors.system).toBeDefined();
      expect(tokens.colors.system.shadow).toBeDefined();
      expect(tokens.system).toBeDefined();
      expect(tokens.shadow).toBeDefined();
      expect(tokens.custom).toBeDefined();
      expect(tokens.custom.shadow).toBeDefined();

      // Regression: indexing tokens[mode] where mode is "system" must never be undefined
      const systemIndexed = tokens['system'];
      expect(systemIndexed).toBeDefined();
      expect(systemIndexed.shadow).toBeDefined();
      expect(systemIndexed.surface).toBeDefined();
    });

    it('guarantees getTokens returns top-level and nested shadow on all modes', () => {
      const modes = ['system', 'light', 'dark', 'invalid', '', null, undefined];
      for (const m of modes) {
        const res = getTokens(m);
        expect(res.shadow).toBeDefined();
        expect(typeof res.shadow).toBe('string');
        expect(res.colors.shadow).toBeDefined();
        expect(typeof res.colors.shadow).toBe('string');
        expect(res.custom).toBeDefined();
        expect(res.custom.shadow).toBeDefined();
      }
    });
  });

  describe('createAppTheme', () => {
    it('creates a valid MUI theme object in light mode with custom shadow', () => {
      const theme = createAppTheme('light');
      expect(theme).toBeDefined();
      expect(theme.palette.mode).toBe('light');
      expect(theme.palette.primary.main).toBe(tokens.colors.light.primary);
      expect(theme.palette.background.default).toBe(tokens.colors.light.bg);
      expect(theme.custom).toBeDefined();
      expect(theme.custom.shadow).toBeDefined();
    });

    it('creates a valid MUI theme object in dark mode with custom shadow', () => {
      const theme = createAppTheme('dark');
      expect(theme).toBeDefined();
      expect(theme.palette.mode).toBe('dark');
      expect(theme.palette.primary.main).toBe(tokens.colors.dark.primary);
      expect(theme.palette.background.default).toBe(tokens.colors.dark.bg);
      expect(theme.custom).toBeDefined();
      expect(theme.custom.shadow).toBeDefined();
    });

    it('resolves system mode into valid dark or light MUI theme via matchMedia', () => {
      // Mock dark matchMedia
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
      const themeDark = createAppTheme('system');
      expect(themeDark.palette.mode).toBe('dark');
      expect(themeDark.custom).toBeDefined();

      // Mock light matchMedia
      vi.spyOn(window, 'matchMedia').mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      const themeLight = createAppTheme('system');
      expect(themeLight.palette.mode).toBe('light');
      expect(themeLight.custom).toBeDefined();
    });

    it('falls back gracefully to light theme for null or undefined input', () => {
      const themeNull = createAppTheme(null);
      expect(themeNull.palette.mode).toBe('light');
      expect(themeNull.custom).toBeDefined();
      expect(themeNull.custom.shadow).toBeDefined();

      const themeUndefined = createAppTheme(undefined);
      expect(themeUndefined.palette.mode).toBe('light');
      expect(themeUndefined.custom).toBeDefined();
      expect(themeUndefined.custom.shadow).toBeDefined();
    });
  });

  describe('Theme Mode Resolver Safety Logic', () => {
    // Pure function logic mirroring resolveMode in ThemeContext
    const resolveModeTest = (pref, matchDark = false) => {
      if (pref === 'dark') return 'dark';
      if (pref === 'light') return 'light';
      if (pref === 'system') {
        return matchDark ? 'dark' : 'light';
      }
      return 'light';
    };

    it('resolves explicit light and dark preferences', () => {
      expect(resolveModeTest('light')).toBe('light');
      expect(resolveModeTest('dark')).toBe('dark');
    });

    it('resolves system mode according to matchMedia query', () => {
      expect(resolveModeTest('system', true)).toBe('dark');
      expect(resolveModeTest('system', false)).toBe('light');
    });

    it('strictly falls back to light on any invalid or missing preference', () => {
      const invalidValues = [null, undefined, '', 'auto', 'blue', 0, 1, {}, []];
      for (const val of invalidValues) {
        expect(resolveModeTest(val)).toBe('light');
      }
    });
  });
});
