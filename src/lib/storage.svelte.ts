import { db } from './db/db';

export const storage = $state({
  /** База открылась и готова. */
  ready: false,
  /** Текст ошибки, если базу открыть не удалось. */
  error: '',
  /** iPhone обещал не удалять данные сам. null — ещё не знаем. */
  persisted: null as boolean | null,
  /** Сколько места занимает Folio на телефоне, байт. null — неизвестно. */
  usage: null as number | null,
});

export async function initStorage(): Promise<void> {
  try {
    await db.open();
    await ensureDeviceId();
    storage.ready = true;
  } catch (e) {
    storage.error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return;
  }
  await protect();
  await refreshUsage();
}

/** Номер этого устройства — понадобится синхронизации, чтобы различать, откуда пришло изменение. */
async function ensureDeviceId(): Promise<void> {
  if (!(await db.meta.get('deviceId'))) {
    await db.meta.put({ key: 'deviceId', value: crypto.randomUUID() });
  }
}

/**
 * Просим iPhone не удалять данные при нехватке места. В iOS 17+ это происходит без диалога:
 * система решает сама и обычно соглашается для приложений с экрана «Домой».
 * От удаления самого приложения с экрана «Домой» это не защищает — для этого резервные копии.
 */
async function protect(): Promise<void> {
  const manager = navigator.storage;
  if (!manager?.persist || !manager.persisted) {
    storage.persisted = false;
    return;
  }
  try {
    storage.persisted = (await manager.persisted()) || (await manager.persist());
  } catch {
    storage.persisted = false;
  }
}

export async function refreshUsage(): Promise<void> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    storage.usage = estimate?.usage ?? null;
  } catch {
    storage.usage = null;
  }
}
