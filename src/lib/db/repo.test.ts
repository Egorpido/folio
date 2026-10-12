import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  completeTask,
  createTask,
  deleteTask,
  restoreTask,
  rolloverOverdue,
  uncompleteTask,
  updateTask,
} from './repo';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('хранилище дел', () => {
  it('сохраняет новое дело с полями для синхронизации', async () => {
    const task = await createTask({ title: 'Купить цветы' });
    const saved = await db.tasks.get(task.id);
    expect(saved).toMatchObject({ title: 'Купить цветы', priority: 0, rev: 1 });
    expect(saved?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved?.createdAt).toBe(saved?.updatedAt);
  });

  it('записывает каждое изменение в очередь синхронизации', async () => {
    const task = await createTask({ title: 'Позвонить маме' });
    await updateTask(task.id, { priority: 1 });
    await deleteTask(task.id);
    const changes = await db.changes.orderBy('seq').toArray();
    expect(changes.map((c) => [c.table, c.id, c.op])).toEqual([
      ['tasks', task.id, 'put'],
      ['tasks', task.id, 'put'],
      ['tasks', task.id, 'delete'],
    ]);
  });

  it('повышает номер версии и время изменения', async () => {
    const task = await createTask({ title: 'Спортзал' });
    const updated = await updateTask(task.id, { title: 'Спортзал вечером' });
    expect(updated?.title).toBe('Спортзал вечером');
    expect(updated?.rev).toBe(2);
    expect(updated?.updatedAt).toBeGreaterThanOrEqual(task.updatedAt);
  });

  it('снимает отметку «выполнено», убирая поле', async () => {
    const task = await createTask({ title: 'Купить хлеб' });
    await updateTask(task.id, { completedAt: 123 });
    await updateTask(task.id, { completedAt: undefined });
    const saved = await db.tasks.get(task.id);
    expect(saved).toBeDefined();
    expect('completedAt' in (saved ?? {})).toBe(false);
  });

  it('удаляет мягко и умеет восстанавливать', async () => {
    const task = await createTask({ title: 'Записаться к врачу' });
    await deleteTask(task.id);
    expect((await db.tasks.get(task.id))?.deletedAt).toBeTypeOf('number');
    await restoreTask(task.id);
    const saved = await db.tasks.get(task.id);
    expect(saved?.deletedAt).toBeUndefined();
    expect(saved?.rev).toBe(3);
  });

  it('отмечает дело выполненным и возвращает обратно', async () => {
    const task = await createTask({ title: 'Купить цветы' });
    await completeTask(task.id);
    expect((await db.tasks.get(task.id))?.completedAt).toBeTypeOf('number');
    await uncompleteTask(task.id);
    expect((await db.tasks.get(task.id))?.completedAt).toBeUndefined();
  });

  it('переносит несделанные дела с прошедших дней на сегодня и помнит, с какого дня они просрочены', async () => {
    const late = await createTask({ title: 'Оплатить счёт', dueDate: '2026-10-10' });
    const future = await createTask({ title: 'Врач', dueDate: '2026-10-20' });
    const inbox = await createTask({ title: 'Без даты' });
    const done = await createTask({ title: 'Сделано', dueDate: '2026-10-10', completedAt: 1 });
    const gone = await createTask({ title: 'Удалено', dueDate: '2026-10-10' });
    await deleteTask(gone.id);

    expect(await rolloverOverdue('2026-10-12')).toBe(1);
    expect(await db.tasks.get(late.id)).toMatchObject({ dueDate: '2026-10-12', overdueSince: '2026-10-10', rev: 2 });
    expect((await db.tasks.get(future.id))?.dueDate).toBe('2026-10-20');
    expect((await db.tasks.get(inbox.id))?.dueDate).toBeUndefined();
    expect((await db.tasks.get(done.id))?.dueDate).toBe('2026-10-10');
    expect((await db.tasks.get(gone.id))?.dueDate).toBe('2026-10-10');

    // На следующий день дело переезжает снова, а дата начала просрочки остаётся первой.
    expect(await rolloverOverdue('2026-10-13')).toBe(1);
    expect(await db.tasks.get(late.id)).toMatchObject({ dueDate: '2026-10-13', overdueSince: '2026-10-10' });
  });

  it('не трогает несуществующее дело', async () => {
    expect(await updateTask('нет-такого', { title: 'x' })).toBeUndefined();
    await deleteTask('нет-такого');
    expect(await db.changes.count()).toBe(0);
  });
});
