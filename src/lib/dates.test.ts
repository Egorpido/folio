import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  dateFromKey,
  formatDayLong,
  formatDayShort,
  formatDue,
  localDateKey,
  nextMonday,
  nextWeekday,
  weekendStart,
} from './dates';

describe('даты', () => {
  it('строит ключ местной даты с ведущими нулями', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('разбирает ключ обратно в дату', () => {
    const d = dateFromKey('2026-10-10');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 10]);
  });

  it('прибавляет дни через границы месяца и года', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('пишет день недели и дату по-русски с заглавной буквы', () => {
    expect(formatDayLong('2026-10-10')).toBe('Суббота, 10 октября');
  });

  it('считает месяцы, дни недели, выходные и следующую неделю', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    // 12.10.2026 — понедельник.
    expect(nextWeekday('2026-10-12', 1)).toBe('2026-10-19');
    expect(nextWeekday('2026-10-12', 5)).toBe('2026-10-16');
    expect(weekendStart('2026-10-12')).toBe('2026-10-17');
    expect(weekendStart('2026-10-18')).toBe('2026-10-18');
    expect(nextMonday('2026-10-18')).toBe('2026-10-19');
  });

  it('подписывает сроки дел', () => {
    expect(formatDue('2026-10-13', '2026-10-12')).toBe('завтра');
    expect(formatDue('2026-10-16', '2026-10-12')).toMatch(/^пт, 16 окт/);
    expect(formatDue('2026-11-20', '2026-10-12')).toMatch(/^20 нояб/);
    expect(formatDue('2027-01-05', '2026-10-12')).toMatch(/^5 янв\.? 2027$/);
  });

  it('называет ближайшие дни словами', () => {
    expect(formatDayShort('2026-10-10', '2026-10-10')).toBe('сегодня');
    expect(formatDayShort('2026-10-09', '2026-10-10')).toBe('вчера');
    expect(formatDayShort('2026-10-11', '2026-10-10')).toBe('завтра');
    expect(formatDayShort('2026-10-07', '2026-10-10')).toMatch(/^7 окт/);
  });
});
