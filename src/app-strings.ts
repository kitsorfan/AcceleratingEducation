import type { Dictionary } from './i18n/i18n';

/** Text in the page header and footer, shared by every lesson. The brand stays in English. */
const en = {
  appName: 'ACCELERATING EDUCATION',
  teacher: 'Dr. Kontokostas George',
  language: 'Language',
  footer: 'Interactive physics lessons in English and Greek.',
  credit: 'Software development by',
} as const;

export type AppKey = keyof typeof en;

const el: Record<AppKey, string> = {
  appName: 'ACCELERATING EDUCATION',
  teacher: 'Dr. Kontokostas George',
  language: 'Γλώσσα',
  footer: 'Διαδραστικά μαθήματα φυσικής στα ελληνικά και στα αγγλικά.',
  credit: 'Ανάπτυξη λογισμικού:',
};

export const APP_STRINGS: Dictionary<AppKey> = { en, el };
