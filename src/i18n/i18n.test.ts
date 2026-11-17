import { describe, expect, it } from 'vitest';
import { detectLang, escapeHtml, formatNumber, interpolate, translate, type Dictionary } from './i18n';

describe('detectLang', () => {
  it('prefers ?lang= in the URL', () => {
    expect(detectLang('?lang=el', 'en', ['en-US'])).toBe('el');
    expect(detectLang('?x=1&lang=en', 'el', ['el-GR'])).toBe('en');
  });

  it('then the saved choice', () => {
    expect(detectLang('', 'el', ['en-US'])).toBe('el');
  });

  it('then the first supported browser language', () => {
    expect(detectLang('', null, ['el-GR', 'en-US'])).toBe('el');
    expect(detectLang('', null, ['fr-FR', 'en-US', 'el'])).toBe('en');
    expect(detectLang('', null, ['fr-FR', 'EL'])).toBe('el');
  });

  it('ignores unsupported or tampered values and falls back to English', () => {
    expect(detectLang('?lang=de', 'xx', ['de-DE'])).toBe('en');
    expect(detectLang('', null, [])).toBe('en');
  });
});

describe('interpolate', () => {
  it('fills placeholders and leaves unknown ones alone', () => {
    expect(interpolate('p = {p} kg·m/s, {missing}', { p: '75,000' })).toBe('p = 75,000 kg·m/s, {missing}');
  });

  it('returns the template untouched without params', () => {
    expect(interpolate('t = {t} s')).toBe('t = {t} s');
  });
});

describe('translate', () => {
  const dict: Dictionary<'hello'> = { en: { hello: 'Hello {name}' }, el: { hello: 'Γεια σου {name}' } };

  it('picks the requested language', () => {
    expect(translate(dict, 'hello', { name: 'Α' }, 'el')).toBe('Γεια σου Α');
    expect(translate(dict, 'hello', { name: 'A' }, 'en')).toBe('Hello A');
  });
});

describe('formatNumber', () => {
  it('writes Greek numbers with a decimal comma and dot thousands', () => {
    expect(formatNumber(375_000, 0, 'el')).toBe('375.000');
    expect(formatNumber(5_000, 0, 'el')).toBe('5.000');
    expect(formatNumber(22.5, 1, 'el')).toBe('22,5');
  });

  it('writes English numbers with a decimal point and comma thousands', () => {
    expect(formatNumber(375_000, 0, 'en')).toBe('375,000');
    expect(formatNumber(22.5, 1, 'en')).toBe('22.5');
  });

  it('never shows a negative zero', () => {
    expect(formatNumber(-0.0001, 1, 'en')).toBe('0.0');
    expect(formatNumber(-0, 0, 'el')).toBe('0');
  });
});

describe('escapeHtml', () => {
  it('neutralises markup', () => {
    expect(escapeHtml('<b a="1">&\'')).toBe('&#60;b a=&#34;1&#34;&#62;&#38;&#39;');
  });
});
