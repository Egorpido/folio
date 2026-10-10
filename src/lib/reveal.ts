/**
 * Прокручивает список (`.scroller`) так, чтобы элемент оказался виден целиком:
 * не под нижней панелью с полем ввода и не за верхним краем.
 */
export function revealInScroller(el: HTMLElement): void {
  const scroller = el.closest<HTMLElement>('.scroller');
  if (!scroller) return;
  const box = scroller.getBoundingClientRect();
  const dock = document.querySelector('.dock');
  const visibleBottom = Math.min(box.bottom, dock ? dock.getBoundingClientRect().top : box.bottom);
  const rect = el.getBoundingClientRect();
  const margin = 12;
  if (rect.bottom > visibleBottom - margin) {
    scroller.scrollBy({ top: rect.bottom - visibleBottom + margin, behavior: 'smooth' });
  } else if (rect.top < box.top + margin) {
    scroller.scrollBy({ top: rect.top - box.top - margin, behavior: 'smooth' });
  }
}
