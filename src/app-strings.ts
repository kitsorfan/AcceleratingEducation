import type { Dictionary } from './i18n/i18n';

/** Text in the page header and footer, shared by every lesson. */
const en = {
  appName: 'Physics AI Teacher',
  language: 'Language',
  footer: 'Interactive physics lessons in English and Greek.',
} as const;

export type AppKey = keyof typeof en;

const el: Record<AppKey, string> = {
  appName: 'Physics AI Teacher',
  language: 'Γλώσσα',
  footer: 'Διαδραστικά μαθήματα φυσικής στα ελληνικά και στα αγγλικά.',
};

export const APP_STRINGS: Dictionary<AppKey> = { en, el };
