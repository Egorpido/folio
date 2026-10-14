/**
 * Резервная копия — JSON-файл со всеми делами (включая удалённые: они нужны будущей синхронизации).
 * Чистые функции: собрать файл, прочитать и проверить файл, решить, что взять при слиянии.
 */
import type { Priority, Task } from './db/schema';
import { localDateKey } from './dates';

export const BACKUP_FORMAT = 1;

export interface BackupFile {
  app: 'folio';
  format: number;
  exportedAt: string;
  tasks: Task[];
}

export function buildBackup(tasks: readonly Task[], now = new Date()): BackupFile {
  return { app: 'folio', format: BACKUP_FORMAT, exportedAt: now.toISOString(), tasks: [...tasks] };
}

export function backupFileName(now = new Date()): string {
  return `Folio-копия-${localDateKey(now)}.json`;
}

export type ParsedBackup =
  | { ok: true; tasks: Task[]; exportedAt?: string; skipped: number }
  | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** Проверяет одну запись из файла. Неподходящая запись пропускается, а не ломает восстановление. */
function toTask(raw: unknown): Task | null {
  if (!isObject(raw)) return null;
  const { id, title, createdAt, updatedAt, rev, priority, order } = raw;
  if (typeof id !== 'string' || !id || typeof title !== 'string') return null;
  if (!isNumber(createdAt) || !isNumber(updatedAt) || !isNumber(rev) || !isNumber(order)) return null;
  if (priority !== 0 && priority !== 1 && priority !== 2 && priority !== 3) return null;

  const task: Task = { id, title, createdAt, updatedAt, rev, order, priority: priority as Priority };
  for (const key of ['notes', 'projectId', 'parentId', 'repeat'] as const) {
    if (typeof raw[key] === 'string') task[key] = raw[key];
  }
  for (const key of ['dueDate', 'deadline', 'overdueSince'] as const) {
    const value = raw[key];
    if (typeof value === 'string' && DATE.test(value)) task[key] = value;
  }
  if (typeof raw.dueTime === 'string' && TIME.test(raw.dueTime)) task.dueTime = raw.dueTime;
  if (isNumber(raw.completedAt)) task.completedAt = raw.completedAt;
  if (isNumber(raw.deletedAt)) task.deletedAt = raw.deletedAt;
  return task;
}

export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Это не файл копии Folio: его не получается прочитать.' };
  }
  if (!isObject(data) || data.app !== 'folio' || !Array.isArray(data.tasks)) {
    return { ok: false, error: 'Это не файл копии Folio.' };
  }
  if (!isNumber(data.format) || data.format > BACKUP_FORMAT) {
    return { ok: false, error: 'Копия сделана более новой версией Folio. Обновите приложение и попробуйте снова.' };
  }
  const tasks: Task[] = [];
  let skipped = 0;
  for (const raw of data.tasks) {
    const task = toTask(raw);
    if (task) tasks.push(task);
    else skipped += 1;
  }
  return { ok: true, tasks, exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : undefined, skipped };
}

/** При слиянии из двух версий одного дела побеждает более свежая (позже изменена, при равенстве — больший rev). */
export function pickNewer(local: ReadonlyMap<string, Task>, incoming: readonly Task[]): Task[] {
  return incoming.filter((task) => {
    const current = local.get(task.id);
    return !current || task.updatedAt > current.updatedAt || (task.updatedAt === current.updatedAt && task.rev > current.rev);
  });
}
