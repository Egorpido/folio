/**
 * Умный разбор быстрого ввода без ИИ: «Позвонить маме завтра в 18:00 !!!» →
 * дело «Позвонить маме» на завтра, 18:00, срочно. Работает без интернета.
 */
import type { Priority } from './db/schema';
import { addDays, addMonths, capitalize, makeDateKey, nextMonday, nextWeekday, weekendStart } from './dates';

export type TokenKind = 'date' | 'time' | 'priority';

export interface FoundToken {
  kind: TokenKind;
  start: number;
  end: number;
}

export interface ParsedTask {
  /** Текст дела без распознанных слов. */
  title: string;
  dueDate?: string;
  dueTime?: string;
  priority: Priority;
  /** Что распознано — для подсказок над полем ввода. */
  found: FoundToken[];
}

interface Hit<T> {
  start: number;
  end: number;
  value: T;
}

type Matcher<T> = (text: string, today: string) => Hit<T> | null;

// Границы слова для кириллицы: \b в JavaScript понимает только латиницу.
const rx = (body: string) => new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'giu');

/** Первое совпадение, которое функция значения не отбросила (вернув null). */
function scan<T>(re: RegExp, text: string, value: (m: RegExpExecArray) => T | null): Hit<T> | null {
  re.lastIndex = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const v = value(m);
    if (v !== null) return { start: m.index, end: m.index + m[0].length, value: v };
  }
  return null;
}

const NUMBER_WORDS: Record<string, number> = {
  один: 1, одну: 1, два: 2, две: 2, три: 3, четыре: 4, пять: 5,
  шесть: 6, семь: 7, восемь: 8, девять: 9, десять: 10,
};

function weekdayIndex(word: string): number | null {
  const w = word.toLowerCase();
  if (w === 'пн' || w.startsWith('пон')) return 1;
  if (w === 'вт' || w.startsWith('вто')) return 2;
  if (w === 'ср' || w.startsWith('сре')) return 3;
  if (w === 'чт' || w.startsWith('чет')) return 4;
  if (w === 'пт' || w.startsWith('пят')) return 5;
  if (w === 'сб' || w.startsWith('суб')) return 6;
  if (w === 'вс' || w.startsWith('вос')) return 0;
  return null;
}

function monthIndex(word: string): number | null {
  const w = word.toLowerCase();
  const order: [string, number][] = [
    ['янв', 1], ['фев', 2], ['мар', 3], ['апр', 4], ['ма', 5], ['июн', 6],
    ['июл', 7], ['авг', 8], ['сен', 9], ['окт', 10], ['ноя', 11], ['дек', 12],
  ];
  return order.find(([prefix]) => w.startsWith(prefix))?.[1] ?? null;
}

/** День и месяц без года: этот год, а если дата уже прошла — следующий. */
function inferYear(today: string, month: number, day: number, year?: number): string | null {
  if (year) return makeDateKey(year < 100 ? 2000 + year : year, month, day);
  const thisYear = Number(today.slice(0, 4));
  const key = makeDateKey(thisYear, month, day);
  if (!key) return null;
  return key < today ? makeDateKey(thisYear + 1, month, day) : key;
}

const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

function toHour24(hour: number, period?: string): number | null {
  if (!period) return hour <= 23 ? hour : null;
  if (hour < 1 || hour > 12) return null;
  switch (period.toLowerCase()) {
    case 'утра':
      return hour === 12 ? 0 : hour;
    case 'дня':
      return hour <= 5 ? hour + 12 : hour;
    case 'вечера':
      return hour < 12 ? hour + 12 : null;
    case 'ночи':
      return hour === 12 ? 0 : hour <= 5 ? hour : hour + 12;
    default:
      return null;
  }
}

const PREFIX = '(?:(?:на|в|во|к|до)\\s+)?';

const PRIORITY: Matcher<Priority> = (text) =>
  scan(/(?<=^|\s)(!{1,3})(?=\s|$)/gu, text, (m) => (4 - (m[1] ?? '').length) as Priority);

// Время с минутами: «18:00», «в 18:00», «в 18.30». Ищется раньше дат, чтобы «в 15.10» стало временем.
const EXACT_TIME: Matcher<string>[] = [
  (text) => scan(rx('(?:(?:в|к|до)\\s+)?([01]?\\d|2[0-3]):([0-5]\\d)'), text, (m) => hhmm(+m[1]!, +m[2]!)),
  (text) => scan(rx('(?:в|к|до)\\s+([01]?\\d|2[0-3])\\.([0-5]\\d)'), text, (m) => hhmm(+m[1]!, +m[2]!)),
];

const DATES: Matcher<string>[] = [
  (text, today) =>
    scan(rx('(?:на\\s+)?(послезавтра|завтра|сегодня)'), text, (m) => {
      const shift: Record<string, number> = { сегодня: 0, завтра: 1, послезавтра: 2 };
      return addDays(today, shift[m[1]!.toLowerCase()] ?? 0);
    }),
  (text, today) =>
    scan(
      rx(
        'через\\s+(?:(\\d{1,3}|один|одну|два|две|три|четыре|пять|шесть|семь|восемь|девять|десять)\\s+)?' +
          '(день|дня|дней|неделю|недели|недель|месяц|месяца|месяцев)',
      ),
      text,
      (m) => {
        const n = m[1] ? Number(m[1]) || NUMBER_WORDS[m[1].toLowerCase()] || 0 : 1;
        if (!n) return null;
        const unit = m[2]!.toLowerCase();
        if (unit.startsWith('д')) return addDays(today, n);
        if (unit.startsWith('н')) return addDays(today, 7 * n);
        return addMonths(today, n);
      },
    ),
  (text, today) => scan(rx('на\\s+следующей\\s+неделе'), text, () => nextMonday(today)),
  (text, today) => scan(rx('на\\s+(?:этих\\s+)?выходных'), text, () => weekendStart(today)),
  (text, today) =>
    scan(
      rx(
        `${PREFIX}(?:(?:следующ(?:ий|ую|ее|ей|им)|след\\.?)\\s+)?` +
          '(понедельник(?:а|у)?|вторник(?:а|у)?|сред(?:а|у|е|ы)|четверг(?:а|у)?|пятниц(?:а|у|е|ы)|' +
          'суббот(?:а|у|е|ы)|воскресень(?:е|ю|я)|пн|вт|ср|чт|пт|сб|вс)',
      ),
      text,
      (m) => {
        const day = weekdayIndex(m[1]!);
        return day === null ? null : nextWeekday(today, day);
      },
    ),
  (text, today) =>
    scan(
      rx(
        `${PREFIX}(\\d{1,2})\\s+(январ[яь]|феврал[яь]|марта?|апрел[яь]|ма[яй]|июн[яь]|июл[яь]|августа?|` +
          'сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь]|янв|фев|мар|апр|июн|июл|авг|сент|сен|окт|нояб|ноя|дек)\\.?' +
          '(?:\\s+(\\d{4})(?:\\s*(?:г\\.?|года))?)?',
      ),
      text,
      (m) => {
        const month = monthIndex(m[2]!);
        return month ? inferYear(today, month, +m[1]!, m[3] ? +m[3] : undefined) : null;
      },
    ),
  // «25.10» или «25.10.2026». Месяц двузначный, чтобы «2.5 кг» не стало датой.
  (text, today) =>
    scan(rx(`${PREFIX}(\\d{1,2})[./](\\d{2})(?:[./](\\d{4}|\\d{2}))?`), text, (m) =>
      inferYear(today, +m[2]!, +m[1]!, m[3] ? +m[3] : undefined),
    ),
];

// «в 18», «в 9 утра», «в 7 вечера», «в 3 часа дня». Голое «в 18» — только в конце текста,
// иначе «встреча в 2 магазинах» превратилась бы во время.
const HOUR_TIME: Matcher<string> = (text) =>
  scan(rx('(?:в|к|до)\\s+(\\d{1,2})(\\s*час(?:а|ов)?)?(?:\\s+(утра|дня|вечера|ночи))?'), text, (m) => {
    const atEnd = text.slice(m.index + m[0].length).trim() === '';
    if (!m[2] && !m[3] && !atEnd) return null;
    const hour = toHour24(+m[1]!, m[3]);
    return hour === null ? null : hhmm(hour, 0);
  });

/** Самое раннее в тексте совпадение среди нескольких способов записи. */
function earliest<T>(matchers: Matcher<T>[], text: string, today: string): Hit<T> | null {
  let best: Hit<T> | null = null;
  for (const matcher of matchers) {
    const hit = matcher(text, today);
    if (hit && (!best || hit.start < best.start)) best = hit;
  }
  return best;
}

function clean(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^[\s,;:–—-]+/, '')
    .replace(/[\s,;:–—-]+$/, '')
    .trim();
}

/**
 * Разбирает текст быстрого ввода. `ignore` — что пользователь попросил считать обычным текстом
 * (нажал на подсказку над полем). Если после разбора от дела ничего не остаётся, текст берётся как есть.
 */
export function parseTask(input: string, today: string, ignore: ReadonlySet<TokenKind> = new Set()): ParsedTask {
  let masked = input;
  const found: FoundToken[] = [];
  const take = <T>(hit: Hit<T> | null, kind: TokenKind): T | undefined => {
    if (!hit) return undefined;
    found.push({ kind, start: hit.start, end: hit.end });
    masked = masked.slice(0, hit.start) + ' '.repeat(hit.end - hit.start) + masked.slice(hit.end);
    return hit.value;
  };

  const priority = ignore.has('priority') ? undefined : take(PRIORITY(masked, today), 'priority');
  let dueTime = ignore.has('time') ? undefined : take(earliest(EXACT_TIME, masked, today), 'time');
  let dueDate = ignore.has('date') ? undefined : take(earliest(DATES, masked, today), 'date');
  if (!dueTime && !ignore.has('time')) dueTime = take(HOUR_TIME(masked, today), 'time');
  if (dueTime && !dueDate) dueDate = today;

  let title = clean(masked);
  if (!title) return { title: input.trim(), priority: 0, found: [] };
  // «Завтра купить хлеб» → «Купить хлеб»: если начало текста ушло в дату, поднимаем первую букву.
  if (found.some((t) => t.start === input.length - input.trimStart().length)) title = capitalize(title);

  found.sort((a, b) => a.start - b.start);
  return { title, dueDate, dueTime, priority: priority ?? 0, found };
}
