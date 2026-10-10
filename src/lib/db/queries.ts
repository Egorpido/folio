import { liveQuery } from 'dexie';
import { db } from './db';

/** Сколько дел хранится (без удалённых). Значение обновляется само при любом изменении базы. */
export const liveTaskCount = () => liveQuery(() => db.tasks.filter((t) => !t.deletedAt).count());

/** Все открытые дела: не выполненные и не удалённые. */
export const liveOpenTasks = () => liveQuery(() => db.tasks.filter((t) => !t.deletedAt && !t.completedAt).toArray());
