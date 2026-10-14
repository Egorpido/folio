/** «512 Б», «48 КБ», «1,4 МБ». */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} КБ`;
  return `${(kb / 1024).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} МБ`;
}

const pluralRules = new Intl.PluralRules('ru-RU');

/** plural(5, ['дело', 'дела', 'дел']) → «5 дел». */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const form = pluralRules.select(n);
  return `${n} ${form === 'one' ? one : form === 'few' ? few : many}`;
}

const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const relative = new Intl.RelativeTimeFormat('ru-RU', { numeric: 'auto' });

const startOfDay = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);

/** «сегодня в 12:30», «вчера в 09:15», «5 дней назад». */
export function formatAgo(timestamp: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(timestamp)) / 86_400_000);
  if (days <= 0) return `сегодня в ${timeFormat.format(timestamp)}`;
  if (days === 1) return `вчера в ${timeFormat.format(timestamp)}`;
  return relative.format(-days, 'day');
}
