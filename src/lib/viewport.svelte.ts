/**
 * Видимая часть экрана и клавиатура. На iPhone клавиатура не сжимает страницу, а ложится поверх.
 * Оболочка приложения (`.shell` в App.svelte) стоит на всю высоту экрана (--fullh) и повторяет
 * верх видимой области (--vvtop), а нижняя панель с полем ввода поднимается над клавиатурой сдвигом.
 */
const KEYBOARD_KEY = 'folio:kb';

function readKeyboard(): number {
  try {
    return Number(localStorage.getItem(KEYBOARD_KEY)) || 0;
  } catch {
    return 0;
  }
}

export const viewport = $state({
  /** Клавиатура открыта (по замеру видимой области). */
  keyboardOpen: false,
  /** Сколько пикселей снизу закрывает клавиатура сейчас. */
  keyboard: 0,
  /** Высота клавиатуры в прошлый раз: поле начинает подниматься одновременно с ней, не дожидаясь замера. */
  lastKeyboard: readKeyboard(),
});

const root = document.documentElement;
let fullHeight = 0;
let lastWidth = 0;

// Считаем прямо в обработчике события, без ожидания следующего кадра.
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

  const keyboard = Math.max(0, Math.round(fullHeight - height));
  const open = keyboard > 150;

  root.style.setProperty('--fullh', `${Math.round(fullHeight)}px`);
  root.style.setProperty('--vvtop', `${Math.round(Math.max(0, top))}px`);
  viewport.keyboard = open ? keyboard : 0;
  viewport.keyboardOpen = open;

  if (open && keyboard !== viewport.lastKeyboard) {
    viewport.lastKeyboard = keyboard;
    try {
      localStorage.setItem(KEYBOARD_KEY, String(keyboard));
    } catch {
      // Не запомнили — в следующий раз поле просто дождётся замера.
    }
  }
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
