import { describe, expect, it } from 'vitest';
import type { Task } from './db/schema';
import { groupForToday } from './tasks';

let counter = 0;
function task(title: string, extra: Partial<Task> = {}): Task {
  counter += 1;
  return { id: `id-${counter}`, title, priority: 0, order: counter, createdAt: 0, updatedAt: 0, rev: 1, ...extra };
}

const TODAY = '2026-10-10';

describe('раскладка дел на экране «Сегодня»', () => {
  it('без даты — во «Входящие», на сегодня — в «На сегодня», раньше — в «Просрочено»', () => {
    const inbox = task('Купить молоко');
    const today = task('Позвонить маме', { dueDate: TODAY });
    const late = task('Оплатить счёт', { dueDate: '2026-10-08' });
    const groups = groupForToday([inbox, today, late], TODAY);
    expect(groups.inbox).toEqual([inbox]);
    expect(groups.today).toEqual([today]);
    expect(groups.overdue).toEqual([late]);
  });

  it('не показывает выполненные, удалённые, подзадачи и будущие дела', () => {
    const groups = groupForToday(
      [
        task('Готово', { completedAt: 1 }),
        task('Удалено', { deletedAt: 1 }),
        task('Подзадача', { parentId: 'x' }),
        task('Завтра', { dueDate: '2026-10-11' }),
      ],
      TODAY,
    );
    expect(groups).toEqual({ overdue: [], today: [], inbox: [] });
  });

  it('держит порядок добавления, а просроченные — от старых к новым', () => {
    const a = task('Первое');
    const b = task('Второе');
    const old = task('Давно', { dueDate: '2026-10-01' });
    const recent = task('Вчера', { dueDate: '2026-10-09' });
    const groups = groupForToday([b, recent, a, old], TODAY);
    expect(groups.inbox.map((t) => t.title)).toEqual(['Первое', 'Второе']);
    expect(groups.overdue.map((t) => t.title)).toEqual(['Давно', 'Вчера']);
  });
});
