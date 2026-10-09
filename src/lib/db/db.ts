import Dexie, { type EntityTable } from 'dexie';
import type { Change, Meta, Task } from './schema';

export class FolioDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  changes!: EntityTable<Change, 'seq'>;
  meta!: EntityTable<Meta, 'key'>;

  constructor(name = 'folio') {
    super(name);
    // Версии схемы. Новые таблицы и поля добавляются новой версией (this.version(2)…),
    // при этом Dexie переносит уже сохранённые данные — их нельзя терять.
    this.version(1).stores({
      tasks: 'id, updatedAt, dueDate, projectId, parentId',
      changes: '++seq, at',
      meta: 'key',
    });
  }
}

export const db = new FolioDB();
