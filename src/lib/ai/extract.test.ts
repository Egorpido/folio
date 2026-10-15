import { describe, expect, it } from 'vitest';
import { buildRequest, buildSystemPrompt, describeHttpError, parseAiContent } from './extract';

const TODAY = '2026-10-15'; // четверг

describe('ИИ-разбор', () => {
  it('даёт модели календарь на две недели с днями недели', () => {
    const prompt = buildSystemPrompt(TODAY, 'Europe/Moscow');
    expect(prompt).toContain('2026-10-15 — четверг, сегодня');
    expect(prompt).toContain('2026-10-16 — пятница, завтра');
    expect(prompt).toContain('2026-10-28 — среда');
    expect(prompt).toContain('Europe/Moscow');
  });

  it('просит строгий JSON по схеме', () => {
    const request = buildRequest('google/gemini-2.5-flash-lite', 'купить молоко', TODAY, 'Europe/Moscow');
    expect(request.model).toBe('google/gemini-2.5-flash-lite');
    expect(request.response_format.type).toBe('json_schema');
    expect(request.messages[1]).toEqual({ role: 'user', content: 'купить молоко' });
  });

  it('разбирает ответ и проверяет даты, время и важность', () => {
    const content = JSON.stringify({
      tasks: [
        { title: 'Позвонить маме', dueDate: '2026-10-16', dueTime: '18:00', priority: 1, notes: null },
        { title: 'Купить молоко', dueDate: null, dueTime: null, priority: 0, notes: '2 литра' },
        { title: 'Плохая дата', dueDate: '2026-02-31', dueTime: '25:00', priority: 9, notes: null },
        { title: '   ', dueDate: null, dueTime: null, priority: 0, notes: null },
        { title: 'Только время', dueDate: null, dueTime: '9:30', priority: 0, notes: null },
      ],
    });
    expect(parseAiContent(content, TODAY)).toEqual([
      { title: 'Позвонить маме', dueDate: '2026-10-16', dueTime: '18:00', priority: 1 },
      { title: 'Купить молоко', priority: 0, notes: '2 литра' },
      { title: 'Плохая дата', priority: 0 },
      { title: 'Только время', dueDate: TODAY, dueTime: '09:30', priority: 0 },
    ]);
  });

  it('понимает ответ, завёрнутый в ```json', () => {
    const content = '```json\n{"tasks":[{"title":"Спортзал","dueDate":null,"dueTime":null,"priority":0,"notes":null}]}\n```';
    expect(parseAiContent(content, TODAY)).toEqual([{ title: 'Спортзал', priority: 0 }]);
  });

  it('объясняет ошибки сервиса по-русски', () => {
    expect(describeHttpError(401)).toMatch(/Ключ не подходит/);
    expect(describeHttpError(402)).toMatch(/балансе/);
  });
});
