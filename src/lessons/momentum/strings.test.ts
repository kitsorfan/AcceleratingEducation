import { describe, expect, it } from 'vitest';
import indexHtml from '../../../index.html?raw';
import { APP_STRINGS } from '../../app-strings';
import { LANGS, type Dictionary } from '../../i18n/i18n';
import { STRINGS } from './strings';
import { TEMPLATE } from './template';

/**
 * The placeholders a string uses, as a sorted set. A name and its `…Inline` form count as the
 * same placeholder: languages differ in where a sentence needs "Truck B" or "the truck B".
 */
function placeholders(text: string): string[] {
  const names = [...text.matchAll(/\{(\w+)\}/g)].map((m) => (m[1] ?? '').replace(/Inline$/, ''));
  return [...new Set(names)].toSorted();
}

/** Every `data-i18n*="key"` in some markup, with the attribute it came from. */
function markupKeys(markup: string): Array<{ attr: string; key: string }> {
  return [...markup.matchAll(/data-i18n(-html|-label)?="([^"]+)"/g)].map((m) => ({ attr: m[1] ?? '', key: m[2] ?? '' }));
}

/** Everything that could make one language show a gap, a raw {placeholder} or a missing value. */
function dictionaryProblems(dict: Dictionary<string>): string[] {
  const problems: string[] = [];
  const keys = Object.keys(dict.en);
  for (const lang of LANGS) {
    for (const key of keys) if (!dict[lang][key]?.trim()) problems.push(`${lang}.${key} is empty or missing`);
    for (const key of Object.keys(dict[lang])) if (!keys.includes(key)) problems.push(`${lang}.${key} is not in en`);
  }
  for (const key of keys) {
    const en = placeholders(dict.en[key] ?? '').join(', ');
    const el = placeholders(dict.el[key] ?? '').join(', ');
    if (en !== el) problems.push(`${key}: en uses {${en}} but el uses {${el}}`);
  }
  return problems;
}

describe('momentum lesson strings', () => {
  it('have the same keys, non-empty text and the same placeholders in both languages', () => {
    expect(dictionaryProblems(STRINGS)).toEqual([]);
  });

  it('cover every key used in the lesson markup, with markup only where it is meant to be', () => {
    const used = markupKeys(TEMPLATE);
    expect(used.length).toBeGreaterThan(20);
    const problems = used.flatMap(({ attr, key }) => {
      if (!Object.hasOwn(STRINGS.en, key)) return [`${key} is not defined`];
      // Keys holding HTML end in "Html" and only those are used with data-i18n-html.
      if (key.endsWith('Html') !== (attr === '-html')) return [`${key} is used with data-i18n${attr}`];
      return [];
    });
    expect(problems).toEqual([]);
  });

  it('write the Greek trucks with Greek capitals, as the textbooks do', () => {
    expect(STRINGS.el.subA).toBe('Α'); // Greek capital alpha, not Latin A
    expect(STRINGS.el.subB).toBe('Β');
    expect(STRINGS.el.truckA.endsWith('Α')).toBe(true);
  });
});

describe('app shell strings', () => {
  it('have the same keys and placeholders in both languages', () => {
    expect(dictionaryProblems(APP_STRINGS)).toEqual([]);
  });

  it('cover every key used in index.html', () => {
    const used = markupKeys(indexHtml).map(({ key }) => key);
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((key) => !Object.hasOwn(APP_STRINGS.en, key))).toEqual([]);
  });
});
