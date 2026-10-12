import type { Priority } from './db/schema';

/** Важность по порядку показа в карточке дела. Цвет кружка — переменная --p1…--p3 из tokens.css. */
export const PRIORITIES: { value: Priority; name: string; hint: string }[] = [
  { value: 1, name: 'Срочно', hint: '!!!' },
  { value: 2, name: 'Важно', hint: '!!' },
  { value: 3, name: 'Можно позже', hint: '!' },
  { value: 0, name: 'Без отметки', hint: '' },
];

export const priorityName = (value: Priority) => PRIORITIES.find((p) => p.value === value)?.name ?? '';
