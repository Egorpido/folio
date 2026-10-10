/** Ключ местной даты «2026-10-10». Такие строки правильно сравниваются как обычный текст. */
export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dateFromKey(key: string): Date {
  const [y = 1970, m = 1, d = 1] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const longFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const shortFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });

/** «Суббота, 10 октября». */
export function formatDayLong(key: string): string {
  return capitalize(longFormat.format(dateFromKey(key)));
}

/** «сегодня», «вчера», «завтра» или «7 окт.». */
export function formatDayShort(key: string, today: string): string {
  if (key === today) return 'сегодня';
  if (key === addDays(today, -1)) return 'вчера';
  if (key === addDays(today, 1)) return 'завтра';
  return shortFormat.format(dateFromKey(key));
}
