/** Прокручивает страницу так, чтобы элемент оказался виден над нижней панелью и клавиатурой. */
export function revealAboveDock(el: Element, dockCover: number): void {
  const rect = el.getBoundingClientRect();
  const vv = window.visualViewport;
  const top = (vv?.offsetTop ?? 0) + 12;
  const bottom = (vv ? vv.offsetTop + vv.height : window.innerHeight) - dockCover - 12;
  if (rect.bottom > bottom) window.scrollBy({ top: rect.bottom - bottom, behavior: 'smooth' });
  else if (rect.top < top) window.scrollBy({ top: rect.top - top, behavior: 'smooth' });
}
