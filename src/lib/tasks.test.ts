import { describe, expect, it } from 'vitest';
import type { Task } from './db/schema';
import { dateFromKey } from './dates';
import { groupForToday } from './tasks';

let counter = 0;
function task(title: string, extra: Partial<Task> = {}): Task {
  counter += 1;
  return { id: `id-${counter}`, title, priority: 0, order: counter, createdAt: 0, updatedAt: 0, rev: 1, ...extra };
}

const TODAY = '2026-10-10';
const NOON = dateFromKey(TODAY).getTime() + 12 * 3600 * 1000;

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

  it('перенесённое на сегодня просроченное дело остаётся в «Просрочено»', () => {
    const rolled = task('Оплатить счёт', { dueDate: TODAY, overdueSince: '2026-10-08' });
    expect(groupForToday([rolled], TODAY).overdue).toEqual([rolled]);
  });

  it('выполненные сегодня — в «Выполнено», вчерашние и удалённые не показываются', () => {
    const doneToday = task('Сделано сегодня', { completedAt: NOON });
    const doneYesterday = task('Сделано вчера', { completedAt: NOON - 24 * 3600 * 1000 });
    const groups = groupForToday(
      [doneToday, doneYesterday, task('Удалено', { deletedAt: 1 }), task('Подзадача', { parentId: 'x' })],
      TODAY,
    );
    expect(groups).toEqual({ overdue: [], today: [], inbox: [], upcoming: [], done: [doneToday] });
  });

  it('дела на будущие дни — в «Запланировано», по дате и времени', () => {
    const later = task('Врач', { dueDate: '2026-10-20' });
    const tomorrowEvening = task('Ужин', { dueDate: '2026-10-11', dueTime: '19:00' });
    const tomorrowMorning = task('Зарядка', { dueDate: '2026-10-11', dueTime: '08:00' });
    const groups = groupForToday([later, tomorrowEvening, tomorrowMorning], TODAY);
    expect(groups.upcoming.map((t) => t.title)).toEqual(['Зарядка', 'Ужин', 'Врач']);
  });

  it('только что выполненное дело пару секунд остаётся на своём месте', () => {
    const fresh = task('Купить цветы', { completedAt: NOON });
    const groups = groupForToday([fresh], TODAY, new Set([fresh.id]));
    expect(groups.inbox).toEqual([fresh]);
    expect(groups.done).toEqual([]);
  });

  it('держит порядок добавления; просроченные — от старых к новым; выполненные — от последних', () => {
    const a = task('Первое');
    const b = task('Второе');
    const old = task('Давно', { dueDate: '2026-10-01' });
    const recent = task('Вчера', { dueDate: '2026-10-09' });
    const early = task('Утром', { completedAt: NOON - 3600 * 1000 });
    const late = task('Днём', { completedAt: NOON });
    const groups = groupForToday([b, recent, a, old, early, late], TODAY);
    expect(groups.inbox.map((t) => t.title)).toEqual(['Первое', 'Второе']);
    expect(groups.overdue.map((t) => t.title)).toEqual(['Давно', 'Вчера']);
    expect(groups.done.map((t) => t.title)).toEqual(['Днём', 'Утром']);
  });
});
