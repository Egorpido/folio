/**
 * Настройки и запуск ИИ-разбора. Ключ хранится только на этом телефоне (localStorage)
 * и не попадает в резервную копию: в копию идут только дела.
 */
import { buildRequest, describeHttpError, parseAiContent, type AiTask } from './extract';

export const PROVIDERS = [
  { id: 'routerai', name: 'RouterAI', baseUrl: 'https://routerai.ru/api/v1', site: 'https://routerai.ru/settings/keys' },
  { id: 'polza', name: 'Polza.ai', baseUrl: 'https://polza.ai/api/v1', site: 'https://polza.ai' },
  { id: 'custom', name: 'Другой адрес', baseUrl: '', site: '' },
] as const;

export const MODELS = [
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', note: 'Рекомендую для начала: быстрая и дешёвая, ≈ 0,03 ₽ за разбор.' },
  { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4 Flash', note: 'Самая дешёвая, сильна в русском, ≈ 0,02 ₽ за разбор.' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 mini', note: 'Точнее с датами и сложными фразами, ≈ 0,13 ₽ за разбор.' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', note: 'Самая умная из списка, для длинных монологов, ≈ 0,15 ₽ за разбор.' },
] as const;

export interface AiSettings {
  provider: string;
  baseUrl: string;
  key: string;
  model: string;
  /** С какой длины текста «ввод» отдаёт его ИИ. 0 — никогда (только обычный ввод). */
  autoMin: number;
}

const KEY = 'folio:ai';
const DEFAULTS: AiSettings = { provider: 'routerai', baseUrl: PROVIDERS[0].baseUrl, key: '', model: MODELS[0].id, autoMin: 50 };

function read(): AiSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export const ai = $state({
  settings: read(),
  /** Идёт запрос к сервису. */
  busy: false,
  /** Найденные дела на проверку. null — окно проверки закрыто. */
  drafts: null as AiTask[] | null,
  /** Растёт после «Добавить всё» — поле ввода очищается. */
  added: 0,
});

export function saveSettings(patch: Partial<AiSettings>): void {
  ai.settings = { ...ai.settings, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(ai.settings));
  } catch {
    // Не сохранилось — настройки проживут до закрытия приложения.
  }
}

export const isAiReady = () => !!ai.settings.key.trim() && !!ai.settings.baseUrl.trim() && !!ai.settings.model.trim();

/** Отправляет текст выбранной модели и возвращает найденные дела. Бросает Error с понятным текстом. */
export async function extractTasks(text: string, today: string): Promise<AiTask[]> {
  const { baseUrl, key, model } = ai.settings;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequest(model.trim(), text, today, timeZone)),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Сервис не ответил за 45 секунд. Попробуйте ещё раз.');
    }
    throw new Error('Нет связи с сервисом ИИ. Проверьте интернет.');
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    // К понятному объяснению добавляем ответ самого сервиса — по нему видно точную причину.
    let detail = '';
    try {
      const body = (await response.json()) as { error?: { message?: string } | string; message?: string };
      detail = (typeof body.error === 'string' ? body.error : body.error?.message) ?? body.message ?? '';
    } catch {
      // Ответ не JSON — обойдёмся без подробностей.
    }
    console.error('ИИ-сервис ответил ошибкой', response.status, detail);
    throw new Error(describeHttpError(response.status) + (detail ? ` Ответ сервиса: «${detail.slice(0, 200)}».` : ''));
  }

  try {
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? '';
    return parseAiContent(content, today);
  } catch {
    throw new Error('Модель ответила непонятно. Попробуйте ещё раз или выберите другую модель.');
  }
}
