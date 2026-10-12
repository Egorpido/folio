/** Плашка внизу экрана, как в Telegram: «Выполнено · Отменить» с отсчётом 5 секунд. */
export interface ToastData {
  id: number;
  text: string;
  /** Если есть — на плашке кнопка «Отменить». */
  undo?: () => unknown;
}

export const toast = $state<{ current: ToastData | null }>({ current: null });

let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Новая плашка заменяет предыдущую. С отменой она висит 5 секунд, без неё — 2,5. */
export function showToast(text: string, undo?: () => unknown): void {
  clearTimeout(timer);
  toast.current = { id: ++seq, text, undo };
  timer = setTimeout(hideToast, undo ? 5000 : 2500);
}

export function hideToast(): void {
  clearTimeout(timer);
  toast.current = null;
}
