/**
 * Видимая часть экрана. На iPhone клавиатура не сжимает страницу, а ложится поверх неё,
 * поэтому оболочка приложения (`.shell` в App.svelte) сама повторяет видимую область:
 * верх — переменная --vvtop, высота до клавиатуры — --vvh.
 */
export const viewport = $state({ keyboardOpen: false });

const root = document.documentElement;
let fullHeight = 0;
let lastWidth = 0;

// Считаем прямо в обработчике события, без ожидания следующего кадра: так оболочка
// не отстаёт от движения экрана ни на кадр.
function measure(): void {
  const vv = window.visualViewport;
  const height = vv ? vv.height : window.innerHeight;
  const top = vv ? vv.offsetTop : 0;
  const width = vv ? vv.width : window.innerWidth;

  // Полная высота экрана без клавиатуры. Меняется только при повороте телефона.
  if (width !== lastWidth) {
    lastWidth = width;
    fullHeight = 0;
  }
  fullHeight = Math.max(fullHeight, height, root.clientHeight);

  root.style.setProperty('--vvh', `${Math.round(height)}px`);
  root.style.setProperty('--vvtop', `${Math.round(Math.max(0, top))}px`);
  viewport.keyboardOpen = fullHeight - height > 150;
}

window.visualViewport?.addEventListener('resize', measure);
window.visualViewport?.addEventListener('scroll', measure);
window.addEventListener('resize', measure);

// В iOS 26 видимая область иногда не возвращается на место после того, как клавиатура спряталась.
// Подталкиваем её и перемеряем ещё несколько раз, пока iPhone заканчивает анимацию.
document.addEventListener('focusout', () => {
  for (const delay of [60, 300, 700]) {
    setTimeout(() => {
      const active = document.activeElement;
      if (!active || active === document.body) window.scrollTo(0, 0);
      measure();
    }, delay);
  }
});

// С открытой клавиатурой iPhone позволяет таскать пальцем весь экран. Разрешаем движение
// только внутри списка, и только если ему есть куда прокручиваться.
document.addEventListener(
  'touchmove',
  (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const scroller = target?.closest('.scroller');
    if (!scroller || scroller.scrollHeight <= scroller.clientHeight) event.preventDefault();
  },
  { passive: false },
);

measure();
