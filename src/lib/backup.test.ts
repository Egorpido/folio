import { describe, expect, it } from 'vitest';
import type { Task } from './db/schema';
import { backupFileName, buildBackup, parseBackup, pickNewer } from './backup';

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  title: `Дело ${id}`,
  priority: 0,
  order: 1,
  createdAt: 100,
  updatedAt: 100,
  rev: 1,
  ...extra,
});

describe('файл резервной копии', () => {
  it('сохраняет и читает обратно все дела, включая выполненные и удалённые', () => {
    const tasks = [
      task('a', { dueDate: '2026-10-14', dueTime: '18:00', notes: 'заметка', priority: 1 }),
      task('b', { completedAt: 500 }),
      task('c', { deletedAt: 600 }),
    ];
    const text = JSON.stringify(buildBackup(tasks, new Date('2026-10-14T10:00:00Z')));
    const parsed = parseBackup(text);
    expect(parsed).toEqual({ ok: true, tasks, exportedAt: '2026-10-14T10:00:00.000Z', skipped: 0 });
  });

  it('называет файл по дате', () => {
    expect(backupFileName(new Date(2026, 9, 14))).toBe('Folio-копия-2026-10-14.json');
  });

  it('отказывается от чужих и испорченных файлов с понятным объяснением', () => {
    expect(parseBackup('не json')).toMatchObject({ ok: false });
    expect(parseBackup('{"app":"other","tasks":[]}')).toMatchObject({ ok: false, error: 'Это не файл копии Folio.' });
    expect(parseBackup('{"app":"folio","format":99,"tasks":[]}')).toMatchObject({ ok: false });
  });

  it('пропускает неподходящие записи, не ломая остальные', () => {
    const text = JSON.stringify({
      app: 'folio',
      format: 1,
      tasks: [task('ok'), { id: 'bad' }, { ...task('weird'), priority: 7 }, 'мусор'],
    });
    const parsed = parseBackup(text);
    expect(parsed.ok && parsed.tasks.map((t) => t.id)).toEqual(['ok']);
    expect(parsed.ok && parsed.skipped).toBe(3);
  });

  it('при слиянии берёт из файла только новые и более свежие версии', () => {
    const local = new Map([
      ['same', task('same')],
      ['older-in-file', task('older-in-file', { updatedAt: 300, rev: 3 })],
      ['newer-in-file', task('newer-in-file', { updatedAt: 100 })],
    ]);
    const incoming = [
      task('same'),
      task('older-in-file', { updatedAt: 200, rev: 2 }),
      task('newer-in-file', { updatedAt: 400, rev: 2 }),
      task('brand-new'),
    ];
    expect(pickNewer(local, incoming).map((t) => t.id)).toEqual(['newer-in-file', 'brand-new']);
  });
});
