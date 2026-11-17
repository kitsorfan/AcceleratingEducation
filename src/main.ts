import './style.css';

import { APP_STRINGS } from './app-strings';
import { getLang, initLang, isLang, onLangChange, setLang, translateDom } from './i18n/i18n';
import { mountMomentumLesson } from './lessons/momentum/lesson';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('App container #app not found');

initLang();

const shell = [...document.querySelectorAll<HTMLElement>('.app-header, .app-footer')];
const langButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-lang]')];

function translateShell(): void {
  for (const part of shell) translateDom(part, APP_STRINGS);
  for (const button of langButtons) button.setAttribute('aria-pressed', String(button.dataset['lang'] === getLang()));
}

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
