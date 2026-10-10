import { describe, expect, it } from 'vitest';
import { addDays, dateFromKey, formatDayLong, formatDayShort, localDateKey } from './dates';

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

  it('называет ближайшие дни словами', () => {
    expect(formatDayShort('2026-10-10', '2026-10-10')).toBe('сегодня');
    expect(formatDayShort('2026-10-09', '2026-10-10')).toBe('вчера');
    expect(formatDayShort('2026-10-11', '2026-10-10')).toBe('завтра');
    expect(formatDayShort('2026-10-07', '2026-10-10')).toMatch(/^7 окт/);
  });
});
