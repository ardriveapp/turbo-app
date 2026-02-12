import { useEffect, useCallback } from 'react';
import { useStore, ThemeMode } from '../store/useStore';

/**
 * Hook for managing theme (light/dark/system) with system preference detection.
 *
 * Applies the 'light' class to documentElement when light mode is active.
 * Dark mode is the default (no class needed, matches :root in CSS).
 */
export function useTheme() {
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);

  // Resolve 'system' preference to actual theme
  const resolveTheme = useCallback((themeMode: ThemeMode): 'light' | 'dark' => {
    if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return themeMode;
  }, []);

  // Apply theme class to document
  const applyTheme = useCallback((themeMode: ThemeMode) => {
    const resolvedTheme = resolveTheme(themeMode);
    const root = document.documentElement;

    if (resolvedTheme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [resolveTheme]);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');

    const handleChange = () => {
      applyTheme('system');
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [theme, applyTheme]);

  // Get the currently resolved theme (useful for UI display)
  const resolvedTheme = resolveTheme(theme);

  return {
    theme,
    setTheme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    isSystem: theme === 'system',
  };
}

/**
 * Utility to get system preference without React (for SSR-safe initial render).
 */
export function getSystemThemePreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
