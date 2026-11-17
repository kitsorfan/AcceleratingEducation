import { describe, expect, it } from 'vitest';
import css from './style.css?raw';
import { isTheme, resolveTheme } from './theme';

/** The declarations of the first rule whose selector is exactly `selector`, one per line. */
function declarations(selector: string): string[] {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return [];
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return body
    .split(';')
    .map((line) => line.trim())
    .filter(Boolean);
}

describe('theme', () => {
  it('follows the device until someone picks a theme', () => {
    expect(resolveTheme(null, false)).toBe('light');
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme('nonsense', true)).toBe('dark');
  });

  it('keeps a picked theme whatever the device says', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('recognises only the two themes', () => {
    expect(isTheme('light')).toBe(true);
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('auto')).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });

  it('uses the same dark colours whether the device or the button asks for them', () => {
    const fromDevice = declarations(":root:not([data-theme='light'])");
    const fromButton = declarations(":root[data-theme='dark']");
    expect(fromDevice.length).toBeGreaterThan(10);
    expect(fromButton).toEqual(fromDevice);
  });
});
