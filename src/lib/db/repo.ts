/**
 * Единственный вход для изменения данных. Экраны не пишут в базу напрямую:
 * каждое изменение здесь обновляет updatedAt и rev и попадает в очередь changes —
 * поверх неё потом можно построить синхронизацию, не трогая экраны.
 */
import { db } from './db';
import type { Change, SyncFields, SyncedTable, Task } from './schema';

/** Изменяемые поля записи. Значение undefined означает «убрать поле». */
export type Patch<T> = { [K in keyof Omit<T, keyof SyncFields>]?: T[K] | undefined };

/** Новое дело: обязателен только текст, остальное — по умолчанию. */
export type NewTask = { title: string } & Patch<Task>;

function logChange(table: SyncedTable, id: string, op: Change['op'], at: number) {
  return db.changes.add({ table, id, op, at });
}

/** Применяет изменения к записи; поля со значением undefined удаляются. */
function applyPatch<T extends object>(record: T, patch: object): T {
  const next = { ...record } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  return next as T;
}

export async function createTask(input: NewTask): Promise<Task> {
  const at = Date.now();
  const base: Task = { id: crypto.randomUUID(), createdAt: at, updatedAt: at, rev: 1, title: '', priority: 0, order: at };
  const task = applyPatch(base, input);
  await db.transaction('rw', db.tasks, db.changes, async () => {
    await db.tasks.add(task);
    await logChange('tasks', task.id, 'put', at);
  });
  return task;
}

export async function updateTask(id: string, patch: Patch<Task>): Promise<Task | undefined> {
  const at = Date.now();
  return db.transaction('rw', db.tasks, db.changes, async () => {
    const current = await db.tasks.get(id);
    if (!current) return undefined;
    const next = applyPatch(current, { ...patch, updatedAt: at, rev: current.rev + 1 });
    await db.tasks.put(next);
    await logChange('tasks', id, 'put', at);
    return next;
  });
}

export const completeTask = (id: string) => updateTask(id, { completedAt: Date.now() });

export const uncompleteTask = (id: string) => updateTask(id, { completedAt: undefined });

/**
 * Несделанные дела с прошедших дней переезжают на сегодня. Дата, с которой дело просрочено,
 * запоминается в overdueSince (при повторных переездах — самая первая). Возвращает число перенесённых.
 */
export async function rolloverOverdue(today: string): Promise<number> {
  const at = Date.now();
  return db.transaction('rw', db.tasks, db.changes, async () => {
    const stale = await db.tasks
      .filter((t) => !t.deletedAt && !t.completedAt && !!t.dueDate && t.dueDate < today)
      .toArray();
    for (const task of stale) {
      const next = applyPatch(task, {
        dueDate: today,
        overdueSince: task.overdueSince ?? task.dueDate,
        updatedAt: at,
        rev: task.rev + 1,
      });
      await db.tasks.put(next);
      await logChange('tasks', task.id, 'put', at);
    }
    return stale.length;
  });
}

/** Мягкое удаление: запись остаётся с отметкой deletedAt, поэтому удаление можно отменить. */
export async function deleteTask(id: string): Promise<void> {
  const at = Date.now();
  await db.transaction('rw', db.tasks, db.changes, async () => {
    const current = await db.tasks.get(id);
    if (!current || current.deletedAt) return;
    await db.tasks.put({ ...current, deletedAt: at, updatedAt: at, rev: current.rev + 1 });
    await logChange('tasks', id, 'delete', at);
  });
}

export async function restoreTask(id: string): Promise<void> {
  const at = Date.now();
  await db.transaction('rw', db.tasks, db.changes, async () => {
    const current = await db.tasks.get(id);
    if (!current?.deletedAt) return;
    await db.tasks.put(applyPatch(current, { deletedAt: undefined, updatedAt: at, rev: current.rev + 1 }));
    await logChange('tasks', id, 'put', at);
  });
}
