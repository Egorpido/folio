import type { Task } from './db/schema';
import { dateFromKey } from './dates';

export interface TodayGroups {
  overdue: Task[];
  today: Task[];
  inbox: Task[];
  /** Дела на будущие дни — для свёрнутого раздела «Запланировано». */
  upcoming: Task[];
  /** Выполненные сегодня — для раздела «Выполнено сегодня». */
  done: Task[];
}

/**
 * Раскладывает дела по разделам экрана «Сегодня».
 * `lingering` — дела, которые только что отмечены выполненными: пару секунд они остаются на своём
 * месте с зачёркиванием и только потом уходят в «Выполнено».
 * Удалённые и подзадачи сюда не попадают.
 */
export function groupForToday(
  tasks: readonly Task[],
  today: string,
  lingering: ReadonlySet<string> = new Set(),
): TodayGroups {
  const groups: TodayGroups = { overdue: [], today: [], inbox: [], upcoming: [], done: [] };
  const dayStart = dateFromKey(today).getTime();

  for (const task of tasks) {
    if (task.deletedAt || task.parentId) continue;
    if (task.completedAt && !lingering.has(task.id)) {
      if (task.completedAt >= dayStart) groups.done.push(task);
      continue;
    }
    if (!task.dueDate) groups.inbox.push(task);
    else if (task.dueDate < today || (task.overdueSince && task.dueDate === today)) groups.overdue.push(task);
    else if (task.dueDate === today) groups.today.push(task);
    else groups.upcoming.push(task);
  }

  const byOrder = (a: Task, b: Task) => a.order - b.order;
  const since = (t: Task) => t.overdueSince ?? t.dueDate ?? '';
  groups.overdue.sort((a, b) => since(a).localeCompare(since(b)) || byOrder(a, b));
  groups.today.sort(byOrder);
  groups.inbox.sort(byOrder);
  groups.upcoming.sort(
    (a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || (a.dueTime ?? '').localeCompare(b.dueTime ?? '') || byOrder(a, b),
  );
  groups.done.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  return groups;
}
