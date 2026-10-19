/**
 * Единственный вход для изменения данных. Экраны не пишут в базу напрямую:
 * каждое изменение здесь обновляет updatedAt и rev и попадает в очередь changes —
 * поверх неё потом можно построить синхронизацию, не трогая экраны.
 */
import { db } from './db';
import type { Change, SyncFields, SyncedTable, Task } from './schema';
import { pickNewer } from '../backup';

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

export interface ImportResult {
  added: number;
  updated: number;
  removed: number;
  /** Все дела до восстановления — чтобы его можно было отменить. */
  snapshot: Task[];
}

/**
 * Восстановление из копии.
 * «merge» — добавить новые дела и обновить те, что в файле свежее; ничего не теряется.
 * «replace» — сделать дела точно как в файле; дела, которых в файле нет, мягко удаляются.
 */
export async function importTasks(incoming: readonly Task[], mode: 'merge' | 'replace'): Promise<ImportResult> {
  const at = Date.now();
  return db.transaction('rw', db.tasks, db.changes, async () => {
    const snapshot = await db.tasks.toArray();
    const local = new Map(snapshot.map((t) => [t.id, t]));
    const fromFile = mode === 'merge' ? pickNewer(local, incoming) : [...incoming];
    const removals: Task[] = [];
    if (mode === 'replace') {
      const inFile = new Set(incoming.map((t) => t.id));
      for (const task of snapshot) {
        if (!inFile.has(task.id) && !task.deletedAt) {
          removals.push({ ...task, deletedAt: at, updatedAt: at, rev: task.rev + 1 });
        }
      }
    }
    const toPut = [...fromFile, ...removals];
    await db.tasks.bulkPut(toPut);
    await db.changes.bulkAdd(
      toPut.map((t) => ({ table: 'tasks' as const, id: t.id, op: t.deletedAt ? ('delete' as const) : ('put' as const), at })),
    );
    const added = fromFile.filter((t) => !local.has(t.id)).length;
    return { added, updated: fromFile.length - added, removed: removals.length, snapshot };
  });
}

/** Возвращает дела точно к состоянию до восстановления (отмена на плашке). */
export async function restoreSnapshot(snapshot: readonly Task[]): Promise<void> {
  const at = Date.now();
  await db.transaction('rw', db.tasks, db.changes, async () => {
    const keep = new Set(snapshot.map((t) => t.id));
    const extra = (await db.tasks.toArray()).filter((t) => !keep.has(t.id)).map((t) => t.id);
    await db.tasks.bulkDelete(extra);
    await db.tasks.bulkPut([...snapshot]);
    await db.changes.bulkAdd([
      ...snapshot.map((t) => ({ table: 'tasks' as const, id: t.id, op: 'put' as const, at })),
      ...extra.map((id) => ({ table: 'tasks' as const, id, op: 'delete' as const, at })),
    ]);
  });
}

/**
 * Мягкое удаление: запись остаётся с отметкой deletedAt, поэтому удаление можно отменить.
 * Подзадачи удаляются вместе с делом и с той же отметкой — так их можно вернуть вместе.
 */
export async function deleteTask(id: string): Promise<void> {
  const at = Date.now();
  await db.transaction('rw', db.tasks, db.changes, async () => {
    const current = await db.tasks.get(id);
    if (!current || current.deletedAt) return;
    const children = await db.tasks.where('parentId').equals(id).filter((t) => !t.deletedAt).toArray();
    for (const task of [current, ...children]) {
      await db.tasks.put({ ...task, deletedAt: at, updatedAt: at, rev: task.rev + 1 });
      await logChange('tasks', task.id, 'delete', at);
    }
  });
}

/** Возвращает удалённое дело и подзадачи, удалённые вместе с ним. */
export async function restoreTask(id: string): Promise<void> {
  const at = Date.now();
  await db.transaction('rw', db.tasks, db.changes, async () => {
    const current = await db.tasks.get(id);
    if (!current?.deletedAt) return;
    const children = await db.tasks.where('parentId').equals(id).filter((t) => t.deletedAt === current.deletedAt).toArray();
    for (const task of [current, ...children]) {
      await db.tasks.put(applyPatch(task, { deletedAt: undefined, updatedAt: at, rev: task.rev + 1 }));
      await logChange('tasks', task.id, 'put', at);
    }
  });
}
