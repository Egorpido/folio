import { liveQuery } from 'dexie';
import { db } from './db';

/** Сколько дел хранится (без удалённых). Значение обновляется само при любом изменении базы. */
export const liveTaskCount = () => liveQuery(() => db.tasks.filter((t) => !t.deletedAt).count());

/** Все неудалённые дела, открытые и выполненные. Обновляется само при любом изменении базы. */
export const liveActiveTasks = () => liveQuery(() => db.tasks.filter((t) => !t.deletedAt).toArray());
