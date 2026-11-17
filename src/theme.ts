/**
 * Light / dark theme. Until someone picks one, the page follows the device (the CSS handles
 * that with `prefers-color-scheme`, so there is no flash on load). A choice is saved and set as
 * `data-theme` on <html>, which the CSS lets win over the device setting.
 */

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'physics-ai-teacher.theme';

const listeners = new Set<(theme: Theme) => void>();
const deviceDark = (): MediaQueryList => window.matchMedia('(prefers-color-scheme: dark)');

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/** The theme in effect: the saved choice, else the device's. */
export function resolveTheme(saved: unknown, deviceIsDark: boolean): Theme {
  if (isTheme(saved)) return saved;
  return deviceIsDark ? 'dark' : 'light';
}

function chosen(): Theme | null {
  const value = document.documentElement.dataset['theme'];
  return isTheme(value) ? value : null;
}

export function getTheme(): Theme {
  return resolveTheme(chosen(), deviceDark().matches);
}

function notify(): void {
  const theme = getTheme();
  for (const listener of listeners) listener(theme);
}

/** Applies a saved choice, if any, and follows the device until someone picks a theme. */
export function initTheme(): Theme {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked: follow the device.
  }
  if (isTheme(saved)) document.documentElement.dataset['theme'] = saved;
  deviceDark().addEventListener('change', () => {
    if (!chosen()) notify();
  });
  return getTheme();
}

/** Switches theme, remembers the choice, and tells every listener. */
export function setTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Not saved: the choice still applies until the page is closed.
  }
  notify();
}

export function onThemeChange(listener: (theme: Theme) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
