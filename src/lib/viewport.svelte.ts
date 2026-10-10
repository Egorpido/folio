/**
 * Сколько пикселей снизу закрыто клавиатурой. На iPhone клавиатура не сжимает страницу,
 * а ложится поверх неё, поэтому нижнюю панель с полем ввода поднимаем сами по visualViewport.
 */
export const viewport = $state({ keyboard: 0 });

function update(): void {
  const vv = window.visualViewport;
  if (!vv) return;
  viewport.keyboard = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
}

window.visualViewport?.addEventListener('resize', update);
window.visualViewport?.addEventListener('scroll', update);
