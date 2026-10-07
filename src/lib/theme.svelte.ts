export type ThemeChoice = 'system' | 'light' | 'dark';

// Выбор темы — удобство одного устройства, поэтому он живёт в localStorage, а не в базе дел.
// Тот же ключ читает скрипт в index.html, чтобы применить тему до отрисовки.
const KEY = 'folio:theme';
const BAR_COLOR = { light: '#F3F4F7', dark: '#0B0E17' } as const;
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export const theme = $state<{ choice: ThemeChoice }>({ choice: readChoice() });

export function setTheme(choice: ThemeChoice): void {
  theme.choice = choice;
  try {
    if (choice === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Хранилище недоступно: выбор продержится до закрытия приложения.
  }
  applyTheme();
}

export function applyTheme(): void {
  const root = document.documentElement;
  if (theme.choice === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme.choice);

  // Строка состояния iPhone берёт цвет из theme-color: подстраиваем её под тему.
  const dark = theme.choice === 'dark' || (theme.choice === 'system' && darkQuery.matches);
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = dark ? BAR_COLOR.dark : BAR_COLOR.light;
  }
}

darkQuery.addEventListener('change', applyTheme);
