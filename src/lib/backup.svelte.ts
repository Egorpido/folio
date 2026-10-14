import { liveQuery } from 'dexie';
import { db } from './db/db';
import type { Task } from './db/schema';
import { backupFileName, buildBackup } from './backup';
import { showToast } from './toasts.svelte';

const DAY = 86_400_000;
const WEEK = 7 * DAY;

export const backup = $state({
  /** Когда последний раз сохраняли копию (мс). null — ещё ни разу. */
  lastAt: null as number | null,
  /** После «Позже» не напоминаем до этого момента. */
  snoozeUntil: 0,
  /** Сколько дел есть (без удалённых): если дел нет, напоминать незачем. */
  taskCount: 0,
  /** Текущее время, обновляется раз в минуту и при возвращении в приложение. */
  now: Date.now(),
  /** Дела загружены из базы (до этого копию собирать нельзя — она вышла бы пустой). */
  loaded: false,
});

// Все дела, как они есть в базе прямо сейчас. Держим под рукой, чтобы собрать файл мгновенно.
let latest: Task[] = [];
let started = false;

/** Пора напомнить о копии: прошла неделя (или копии ещё не было), есть дела и не нажато «Позже». */
export function isBackupDue(): boolean {
  if (!backup.loaded || backup.taskCount === 0 || backup.now < backup.snoozeUntil) return false;
  return backup.lastAt === null || backup.now - backup.lastAt >= WEEK;
}

export async function startBackupWatch(): Promise<void> {
  if (started) return;
  started = true;
  const [last, snooze] = await Promise.all([db.meta.get('lastBackupAt'), db.meta.get('backupSnoozeUntil')]);
  backup.lastAt = typeof last?.value === 'number' ? last.value : null;
  backup.snoozeUntil = typeof snooze?.value === 'number' ? snooze.value : 0;
  liveQuery(() => db.tasks.toArray()).subscribe({
    next: (tasks) => {
      latest = tasks;
      backup.loaded = true;
      backup.taskCount = tasks.filter((t) => !t.deletedAt).length;
    },
  });
  setInterval(() => (backup.now = Date.now()), 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') backup.now = Date.now();
  });
}

/**
 * Сохранить копию через «Поделиться» → «Сохранить в Файлы». Вызывать прямо из нажатия:
 * iPhone открывает это меню только сразу после касания, поэтому файл собирается без ожидания базы.
 * Обычное скачивание в установленных приложениях на iPhone сломано — оно только на компьютере.
 */
export async function saveBackup(): Promise<void> {
  if (!backup.loaded) {
    showToast('Дела ещё загружаются — нажмите через секунду.');
    return;
  }
  const now = new Date();
  const json = JSON.stringify(buildBackup(latest, now), null, 1);
  const file = new File([json], backupFileName(now), { type: 'application/json' });
  const data: ShareData = { files: [file] };
  try {
    if (navigator.canShare?.(data)) await navigator.share(data);
    else download(file);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      showToast('Не получилось сохранить копию. Попробуйте ещё раз.');
    }
    return;
  }
  backup.lastAt = now.getTime();
  backup.now = Date.now();
  await db.meta.put({ key: 'lastBackupAt', value: backup.lastAt });
  showToast('Копия сохранена');
}

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** «Позже» на напоминании: не напоминать сутки. */
export async function snoozeBackup(): Promise<void> {
  backup.snoozeUntil = Date.now() + DAY;
  await db.meta.put({ key: 'backupSnoozeUntil', value: backup.snoozeUntil });
}
