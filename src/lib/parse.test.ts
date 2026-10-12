import { describe, expect, it } from 'vitest';
import { parseTask } from './parse';

// 12 октября 2026 — понедельник.
const TODAY = '2026-10-12';
const parse = (text: string) => {
  const { title, dueDate, dueTime, priority } = parseTask(text, TODAY);
  return { title, dueDate, dueTime, priority };
};

describe('умный ввод', () => {
  it('понимает дату, время и важность в одной фразе', () => {
    expect(parse('Позвонить маме завтра в 18:00 !!!')).toEqual({
      title: 'Позвонить маме',
      dueDate: '2026-10-13',
      dueTime: '18:00',
      priority: 1,
    });
  });

  it('оставляет обычный текст как есть', () => {
    expect(parse('Купить хлеб')).toEqual({ title: 'Купить хлеб', dueDate: undefined, dueTime: undefined, priority: 0 });
  });

  it('сегодня, завтра, послезавтра', () => {
    expect(parse('Сделать отчёт сегодня').dueDate).toBe('2026-10-12');
    expect(parse('Сделать отчёт послезавтра').dueDate).toBe('2026-10-14');
  });

  it('дни недели в разных формах — ближайший такой день после сегодняшнего', () => {
    expect(parse('Встреча в пятницу').dueDate).toBe('2026-10-16');
    expect(parse('Отчёт до пятницы')).toMatchObject({ title: 'Отчёт', dueDate: '2026-10-16' });
    expect(parse('Созвон во вторник').dueDate).toBe('2026-10-13');
    expect(parse('Планёрка в понедельник').dueDate).toBe('2026-10-19');
    expect(parse('Баня сб').dueDate).toBe('2026-10-17');
  });

  it('даты числом и словами, с переходом на следующий год', () => {
    expect(parse('Врач 15 октября в 9 утра')).toMatchObject({ title: 'Врач', dueDate: '2026-10-15', dueTime: '09:00' });
    expect(parse('Подарок к 5 января').dueDate).toBe('2027-01-05');
    expect(parse('Оплатить 25.10').dueDate).toBe('2026-10-25');
    expect(parse('Оплатить 01.11.2026').dueDate).toBe('2026-11-01');
    expect(parse('Отпуск 3 авг.').dueDate).toBe('2027-08-03');
  });

  it('через N дней, недель, месяцев; выходные и следующая неделя', () => {
    expect(parse('через 2 недели продлить страховку')).toMatchObject({
      title: 'Продлить страховку',
      dueDate: '2026-10-26',
    });
    expect(parse('Полить цветы через день').dueDate).toBe('2026-10-13');
    expect(parse('Анализы через месяц').dueDate).toBe('2026-11-12');
    expect(parse('На выходных съездить на дачу')).toMatchObject({ title: 'Съездить на дачу', dueDate: '2026-10-17' });
    expect(parse('на следующей неделе записаться к врачу').dueDate).toBe('2026-10-19');
  });

  it('время в разных записях; без даты — на сегодня', () => {
    expect(parse('Позвонить в 18')).toMatchObject({ title: 'Позвонить', dueDate: TODAY, dueTime: '18:00' });
    expect(parse('Ужин в 7 вечера').dueTime).toBe('19:00');
    expect(parse('Созвон в 3 часа дня').dueTime).toBe('15:00');
    expect(parse('Встреча в пятницу в 15.30')).toMatchObject({ dueDate: '2026-10-16', dueTime: '15:30' });
    expect(parse('Таблетки 21:00').dueTime).toBe('21:00');
  });

  it('не выдумывает даты и время там, где их нет', () => {
    expect(parse('Купить 2.5 кг яблок')).toMatchObject({ title: 'Купить 2.5 кг яблок', dueDate: undefined });
    expect(parse('Встреча в 15 с Петей')).toMatchObject({ title: 'Встреча в 15 с Петей', dueTime: undefined });
    expect(parse('Купить сегодняшнюю газету').dueDate).toBeUndefined();
    expect(parse('Записаться в среднюю группу').dueDate).toBeUndefined();
    expect(parse('Ура!').priority).toBe(0);
  });

  it('важность восклицательными знаками', () => {
    expect(parse('!! позвонить юристу')).toMatchObject({ title: 'Позвонить юристу', priority: 2 });
    expect(parse('Прочитать книгу !').priority).toBe(3);
  });

  it('распознанное можно попросить считать обычным текстом', () => {
    const result = parseTask('Купить подарок завтра', TODAY, new Set(['date']));
    expect(result).toMatchObject({ title: 'Купить подарок завтра', dueDate: undefined });
  });

  it('если от дела ничего не остаётся, берёт текст как есть', () => {
    expect(parse('завтра')).toMatchObject({ title: 'завтра', dueDate: undefined });
  });

  it('сообщает, что именно распознано', () => {
    const kinds = parseTask('Позвонить маме завтра в 18:00 !!!', TODAY).found.map((t) => t.kind);
    expect(kinds).toEqual(['date', 'time', 'priority']);
  });
});
