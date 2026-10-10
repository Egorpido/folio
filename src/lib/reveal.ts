/** Прокручивает список (`.scroller`) так, чтобы элемент оказался виден целиком. */
export function revealInScroller(el: HTMLElement): void {
  const scroller = el.closest<HTMLElement>('.scroller');
  if (!scroller) return;
  const box = scroller.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const margin = 12;
  if (rect.bottom > box.bottom - margin) {
    scroller.scrollBy({ top: rect.bottom - box.bottom + margin, behavior: 'smooth' });
  } else if (rect.top < box.top + margin) {
    scroller.scrollBy({ top: rect.top - box.top - margin, behavior: 'smooth' });
  }
}
