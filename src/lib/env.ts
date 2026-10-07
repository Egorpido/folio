/** Открыто как приложение с экрана «Домой», а не во вкладке Safari. */
export const isStandalone: boolean =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** «Среда, 7 октября». */
export function formatToday(date = new Date()): string {
  return capitalize(
    new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(date),
  );
}

/** «7 октября в 15:40» — когда собрана текущая версия. */
export const buildLabel: string = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(__BUILD_TIME__));
