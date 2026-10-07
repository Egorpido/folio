import { registerSW } from 'virtual:pwa-register';

export const pwa = $state({ needRefresh: false, offlineReady: false });

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

export function startPwa(): void {
  if (!('serviceWorker' in navigator)) return;

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      pwa.needRefresh = true;
    },
    onOfflineReady() {
      pwa.offlineReady = true;
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Приложение на iPhone не перезапускается при возврате из фона, поэтому проверяем обновления сами.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });
    },
  });

  // Новая версия готова, а приложение ушло в фон: обновляемся, пока его не видно.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && pwa.needRefresh) applyUpdate();
  });

  if (navigator.serviceWorker.controller) pwa.offlineReady = true;
}

export function applyUpdate(): void {
  pwa.needRefresh = false;
  void updateSW?.(true);
}
