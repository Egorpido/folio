import type { Task } from './db/schema';

export interface TodayGroups {
  overdue: Task[];
  today: Task[];
  inbox: Task[];
}

/**
 * Раскладывает дела по разделам экрана «Сегодня».
 * Выполненные, удалённые, подзадачи и дела на будущие дни сюда не попадают.
 */
export function groupForToday(tasks: readonly Task[], today: string): TodayGroups {
  const groups: TodayGroups = { overdue: [], today: [], inbox: [] };
  for (const task of tasks) {
    if (task.deletedAt || task.completedAt || task.parentId) continue;
    if (!task.dueDate) groups.inbox.push(task);
    else if (task.dueDate < today) groups.overdue.push(task);
    else if (task.dueDate === today) groups.today.push(task);
  }
  const byOrder = (a: Task, b: Task) => a.order - b.order;
  groups.overdue.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '') || byOrder(a, b));
  groups.today.sort(byOrder);
  groups.inbox.sort(byOrder);
  return groups;
}
