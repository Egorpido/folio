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

/** Тот же день через несколько месяцев; 31 января + 1 месяц = последний день февраля. */
export function addMonths(key: string, months: number): string {
  const date = dateFromKey(key);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return localDateKey(date);
}

/** День недели: 0 — воскресенье, 1 — понедельник … 6 — суббота. */
export function weekday(key: string): number {
  return dateFromKey(key).getDay();
}

/** Ближайший такой день недели строго после сегодняшнего. */
export function nextWeekday(today: string, day: number): string {
  return addDays(today, (day - weekday(today) + 7) % 7 || 7);
}

/** Ближайшая суббота; если сегодня выходной — сегодня. */
export function weekendStart(today: string): string {
  const day = weekday(today);
  return day === 6 || day === 0 ? today : nextWeekday(today, 6);
}

/** Понедельник следующей недели. */
export function nextMonday(today: string): string {
  return nextWeekday(today, 1);
}

/** Проверенная дата: 31.02 и подобные отбрасываются. */
export function makeDateKey(year: number, month: number, day: number): string | null {
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return localDateKey(date);
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const longFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const shortFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const yearFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
const weekdayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });

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

/**
 * Подпись срока дела: «сегодня», «завтра», «вчера»; на ближайшей неделе — «пт, 16 окт.»;
 * дальше — «16 окт.»; в другом году — «16 янв. 2027».
 */
export function formatDue(key: string, today: string): string {
  if (key === today) return 'сегодня';
  if (key === addDays(today, 1)) return 'завтра';
  if (key === addDays(today, -1)) return 'вчера';
  const date = dateFromKey(key);
  const days = Math.round((date.getTime() - dateFromKey(today).getTime()) / 86_400_000);
  if (days > 1 && days < 7) return `${weekdayFormat.format(date)}, ${shortFormat.format(date)}`;
  if (key.slice(0, 4) !== today.slice(0, 4)) return yearFormat.format(date).replace(/\s*г\.$/, '');
  return shortFormat.format(date);
}
