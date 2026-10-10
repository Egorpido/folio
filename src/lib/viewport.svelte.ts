/**
 * Видимая часть экрана. На iPhone клавиатура не сжимает страницу, а сдвигает видимую область
 * вверх и ложится поверх. Поэтому оболочка приложения (`.shell` в App.svelte) сама повторяет
 * видимую область: верх — переменная --vvtop, высота до клавиатуры — --vvh.
 */
export const viewport = $state({ keyboardOpen: false });

const root = document.documentElement;
let frame = 0;
let fullHeight = 0;
let lastWidth = 0;

function measure(): void {
  frame = 0;
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

function schedule(): void {
  if (!frame) frame = requestAnimationFrame(measure);
}

window.visualViewport?.addEventListener('resize', schedule);
window.visualViewport?.addEventListener('scroll', schedule);
window.addEventListener('resize', schedule);

// В iOS 26 видимая область иногда не возвращается на место после того, как клавиатура спряталась.
// Подталкиваем её и перемеряем ещё несколько раз, пока iPhone заканчивает анимацию.
document.addEventListener('focusout', () => {
  for (const delay of [60, 300, 700]) {
    setTimeout(() => {
      const active = document.activeElement;
      if (!active || active === document.body) window.scrollTo(0, 0);
      schedule();
    }, delay);
  }
});

measure();
