import { localDateKey } from './dates';

/** Сегодняшняя дата. Сама меняется в полночь и при возвращении в приложение. */
export const clock = $state({ today: localDateKey() });

function tick(): void {
  const key = localDateKey();
  if (key !== clock.today) clock.today = key;
}

setInterval(tick, 30_000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') tick();
});
