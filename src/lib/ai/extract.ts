/**
 * ИИ-разбор «потока мыслей» в список дел. Чистые функции (запрос, схема ответа, проверка ответа)
 * отделены от сетевого вызова, чтобы их можно было проверить тестами.
 */
import type { Priority } from '../db/schema';
import { addDays, dateFromKey, makeDateKey } from '../dates';

export interface AiTask {
  title: string;
  dueDate?: string;
  dueTime?: string;
  priority: Priority;
  notes?: string;
}

const weekdayLong = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' });

/** Системная подсказка: правила разбора и календарь на две недели, чтобы модель не путала дни недели. */
export function buildSystemPrompt(today: string, timeZone: string): string {
  const calendar = Array.from({ length: 14 }, (_, i) => {
    const key = addDays(today, i);
    const label = i === 0 ? ', сегодня' : i === 1 ? ', завтра' : '';
    return `${key} — ${weekdayLong.format(dateFromKey(key))}${label}`;
  }).join('\n');

  return [
    'Ты помогаешь вести личный планировщик. Пользователь присылает поток мыслей по-русски',
    '(часто надиктованный голосом, без знаков препинания). Выдели из него отдельные дела.',
    '',
    'Правила:',
    '- Каждое действие — отдельное дело. Не выдумывай дел, которых нет в тексте. Не дублируй.',
    '- title: коротко, с заглавной буквы, в повелительной или инфинитивной форме («Позвонить маме», «Купить молоко»), без даты и времени в тексте.',
    '- dueDate: дата в формате ГГГГ-ММ-ДД, только если в тексте есть срок («завтра», «в пятницу», «15-го»). Иначе null.',
    '- dueTime: время ЧЧ:ММ в 24-часовом формате, только если названо («в 6 вечера» → 18:00). Иначе null.',
    '- priority: 1 — срочно/обязательно/горит, 2 — важно, 3 — когда-нибудь/не к спеху, 0 — не указано.',
    '- notes: полезные подробности из текста (что именно купить, номер, адрес), иначе null.',
    '- Дни недели — ближайшие будущие по календарю ниже. «На выходных» — ближайшая суббота.',
    '',
    `Часовой пояс: ${timeZone}. Календарь:`,
    calendar,
  ].join('\n');
}

/** Строгая схема ответа (structured outputs): объект с массивом дел. */
export const TASKS_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          dueDate: { type: ['string', 'null'] },
          dueTime: { type: ['string', 'null'] },
          priority: { type: 'integer', enum: [0, 1, 2, 3] },
          notes: { type: ['string', 'null'] },
        },
        required: ['title', 'dueDate', 'dueTime', 'priority', 'notes'],
        additionalProperties: false,
      },
    },
  },
  required: ['tasks'],
  additionalProperties: false,
} as const;

export function buildRequest(model: string, text: string, today: string, timeZone: string) {
  return {
    model,
    temperature: 0.2,
    max_tokens: 2000,
    messages: [
      { role: 'system', content: buildSystemPrompt(today, timeZone) },
      { role: 'user', content: text },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'tasks', strict: true, schema: TASKS_SCHEMA } },
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function validDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return m ? (makeDateKey(+m[1]!, +m[2]!, +m[3]!) ?? undefined) : undefined;
}

function validTime(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m || +m[1]! > 23 || +m[2]! > 59) return undefined;
  return `${m[1]!.padStart(2, '0')}:${m[2]}`;
}

/**
 * Разбирает ответ модели. Даже при строгой схеме проверяем всё сами: неверные даты и время
 * отбрасываются, дело без текста пропускается.
 */
export function parseAiContent(content: string, today: string): AiTask[] {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const data: unknown = JSON.parse(cleaned);
  const list = isObject(data) && Array.isArray(data.tasks) ? data.tasks : Array.isArray(data) ? data : [];
  const tasks: AiTask[] = [];
  for (const raw of list) {
    if (!isObject(raw) || typeof raw.title !== 'string' || !raw.title.trim()) continue;
    const priority = [0, 1, 2, 3].includes(raw.priority as number) ? (raw.priority as Priority) : 0;
    const task: AiTask = { title: raw.title.trim().slice(0, 500), priority };
    const dueDate = validDate(raw.dueDate);
    const dueTime = validTime(raw.dueTime);
    if (dueDate) task.dueDate = dueDate;
    if (dueTime) task.dueTime = dueTime;
    // Время без даты — значит, сегодня (как и в обычном быстром вводе).
    if (dueTime && !dueDate) task.dueDate = today;
    if (typeof raw.notes === 'string' && raw.notes.trim()) task.notes = raw.notes.trim();
    tasks.push(task);
  }
  return tasks;
}

/** Понятное объяснение ошибки сервиса по коду ответа. */
export function describeHttpError(status: number): string {
  if (status === 401 || status === 403) return 'Ключ не подходит. Проверьте его в «Ещё → ИИ-ввод».';
  if (status === 402) return 'На балансе сервиса закончились деньги. Пополните его на сайте сервиса.';
  if (status === 404) return 'Сервис не знает такую модель. Выберите другую в «Ещё → ИИ-ввод».';
  if (status === 429) return 'Слишком много запросов подряд. Подождите минуту и попробуйте снова.';
  if (status >= 500) return 'Сервис сейчас не отвечает. Попробуйте чуть позже.';
  return `Сервис ответил ошибкой ${status}. Попробуйте ещё раз.`;
}
