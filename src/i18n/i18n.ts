/**
 * Tiny two-language (English / Greek) translation layer.
 *
 * Each module keeps its own dictionary with the same keys in both languages (the types enforce
 * it). Static text is marked in the markup with `data-i18n` attributes and filled in by
 * `translateDom`; dynamic text calls `translate`. Numbers are formatted per language
 * (Greek: 1.234,5 / English: 1,234.5).
 */

export type Lang = 'en' | 'el';

export const LANGS: readonly Lang[] = ['en', 'el'];

export type Dictionary<K extends string> = { readonly [L in Lang]: Readonly<Record<K, string>> };

export type Params = Readonly<Record<string, string | number>>;

const STORAGE_KEY = 'physics-ai-teacher.lang';
const LOCALES: Record<Lang, string> = { en: 'en-GB', el: 'el-GR' };

let current: Lang = 'en';
const listeners = new Set<(lang: Lang) => void>();

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'el';
}

/** Chooses the language: an explicit `?lang=` wins, then the saved choice, then the browser's languages. */
export function detectLang(query: string, saved: string | null, browserLangs: readonly string[]): Lang {
  const fromQuery = new URLSearchParams(query).get('lang');
  if (isLang(fromQuery)) return fromQuery;
  if (isLang(saved)) return saved;
  for (const tag of browserLangs) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

export function getLang(): Lang {
  return current;
}

/** Reads the starting language from the URL, storage and browser, without saving anything. */
export function initLang(): Lang {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked (private mode, strict settings): fall back to the browser language.
  }
  current = detectLang(location.search, saved, navigator.languages);
  document.documentElement.lang = current;
  return current;
}

/** Switches language, remembers the choice, and tells every listener. */
export function setLang(lang: Lang): void {
  current = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not saved: the choice still applies until the page is closed.
  }
  // A shared link like ?lang=el would otherwise override the new choice on reload.
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    url.searchParams.set('lang', lang);
    history.replaceState(history.state, '', url);
  }
  for (const listener of listeners) listener(lang);
}

export function onLangChange(listener: (lang: Lang) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Fills `{name}` placeholders. Unknown placeholders are left as they are. */
export function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export function translate<K extends string>(dict: Dictionary<K>, key: K, params?: Params, lang: Lang = current): string {
  return interpolate(dict[lang][key], params);
}

function hasKey<K extends string>(dict: Dictionary<K>, key: string | undefined): key is K {
  return key !== undefined && Object.hasOwn(dict.en, key);
}

/**
 * Fills marked elements under `root` from the dictionary:
 * `data-i18n` sets the text, `data-i18n-html` sets trusted markup from the dictionary
 * (never user input), and `data-i18n-label` sets `aria-label`.
 */
export function translateDom<K extends string>(root: ParentNode, dict: Dictionary<K>, lang: Lang = current): void {
  const strings = dict[lang];
  for (const node of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = node.dataset['i18n'];
    if (hasKey(dict, key)) node.textContent = strings[key];
  }
  for (const node of root.querySelectorAll<HTMLElement>('[data-i18n-html]')) {
    const key = node.dataset['i18nHtml'];
    if (hasKey(dict, key)) node.innerHTML = strings[key];
  }
  for (const node of root.querySelectorAll<HTMLElement>('[data-i18n-label]')) {
    const key = node.dataset['i18nLabel'];
    if (hasKey(dict, key)) node.setAttribute('aria-label', strings[key]);
  }
}

const formatters = new Map<string, Intl.NumberFormat>();

/** Formats a number with a fixed number of decimals, the way the language writes it. */
export function formatNumber(value: number, digits = 0, lang: Lang = current): string {
  const id = `${lang}:${digits}`;
  let formatter = formatters.get(id);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALES[lang], {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      // Group thousands even in four-digit numbers, so 5000 and 25000 line up as 5,000 / 25,000.
      useGrouping: 'always',
    });
    formatters.set(id, formatter);
  }
  // Never show "-0" or "-0.0" for values that round to zero.
  const shown = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
  return formatter.format(shown);
}

/** Escapes text for use inside HTML markup. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}
