import './style.css';

import { APP_STRINGS } from './app-strings';
import { getLang, initLang, isLang, onLangChange, setLang, translateDom } from './i18n/i18n';
import { mountMomentumLesson } from './lessons/momentum/lesson';
import { getTheme, initTheme, onThemeChange, setTheme } from './theme';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('App container #app not found');

initLang();
initTheme();

const shell = [...document.querySelectorAll<HTMLElement>('.app-header, .app-footer')];
const langButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-lang]')];
const themeButton = document.querySelector<HTMLButtonElement>('#theme-toggle');

function translateShell(): void {
  for (const part of shell) translateDom(part, APP_STRINGS);
  for (const button of langButtons) button.setAttribute('aria-pressed', String(button.dataset['lang'] === getLang()));
  // A tooltip for mouse users, in the same words as the screen-reader label.
  if (themeButton) themeButton.title = themeButton.getAttribute('aria-label') ?? '';
}

function showTheme(): void {
  themeButton?.setAttribute('aria-pressed', String(getTheme() === 'dark'));
}

themeButton?.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
onThemeChange(showTheme);
showTheme();

for (const button of langButtons) {
  button.addEventListener('click', () => {
    const lang = button.dataset['lang'];
    if (isLang(lang) && lang !== getLang()) setLang(lang);
  });
}

onLangChange(translateShell);
translateShell();

const lesson = mountMomentumLesson(app);

if (import.meta.env.DEV) {
  // Dev only (stripped from production builds): poke at the lesson from the console.
  (window as unknown as { lesson: typeof lesson }).lesson = lesson;
}
