import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { createTask, deleteTask, restoreTask, updateTask } from './repo';

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

  it('не трогает несуществующее дело', async () => {
    expect(await updateTask('нет-такого', { title: 'x' })).toBeUndefined();
    await deleteTask('нет-такого');
    expect(await db.changes.count()).toBe(0);
  });
});
