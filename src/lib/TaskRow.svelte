<script lang="ts">
  import { slide } from 'svelte/transition';
  import type { Task } from './db/schema';
  import { clock } from './clock.svelte';
  import { formatDue } from './dates';

  export type SwipeDirection = 'left' | 'right';

  let {
    task,
    animate = false,
    swipeable = true,
    restorable = false,
    ontoggle,
    onswipe,
    onopen,
    subtasks,
  }: {
    task: Task;
    /** Сколько подзадач сделано из скольких — «2 из 5» под делом. */
    subtasks?: { done: number; total: number };
    animate?: boolean;
    /** Свайп вправо — на завтра, влево — удалить. */
    swipeable?: boolean;
    /** Строка в «Выполнено»: справа подпись «Вернуть». */
    restorable?: boolean;
    ontoggle: (task: Task) => void;
    onswipe?: (task: Task, direction: SwipeDirection) => void;
    /** Долгое нажатие — открыть карточку дела. */
    onopen?: (task: Task) => void;
  } = $props();

  // На сколько пикселей нужно протянуть строку, чтобы свайп сработал.
  const THRESHOLD = 84;
  // Сколько держать палец, чтобы открылась карточка.
  const LONG_PRESS_MS = 450;
  let pressTimer: ReturnType<typeof setTimeout> | undefined;
  let longPressed = false;

  let row = $state<HTMLElement>();
  let offset = $state(0);
  let dragging = $state(false);
  let leaving = $state(false);
  let pressed = $state(false);

  let pointerId = -1;
  let startX = 0;
  let startY = 0;
  let mode: '' | 'swipe' | 'scroll' = '';

  const done = $derived(!!task.completedAt);
  const direction = $derived(offset > 0 ? 'right' : offset < 0 ? 'left' : '');
  const armed = $derived(Math.abs(offset) > THRESHOLD);
  // «Можно позже» не бывает просроченным — красную пометку не показываем.
  const overdueFrom = $derived(
    task.priority === 3
      ? undefined
      : (task.overdueSince ?? (task.dueDate && task.dueDate < clock.today ? task.dueDate : undefined)),
  );
  const overdueLabel = $derived(overdueFrom ? formatDue(overdueFrom, clock.today) : '');
  // Крайний срок: «до пт, 23 окт.»; сегодня или прошёл — заметным цветом.
  const deadlineLabel = $derived.by(() => {
    if (!task.deadline) return '';
    if (task.deadline < clock.today) return `срок был ${formatDue(task.deadline, clock.today)}`;
    if (task.deadline === clock.today) return 'срок сегодня';
    return `до ${formatDue(task.deadline, clock.today)}`;
  });
  const deadlineUrgent = $derived(!!task.deadline && task.deadline <= clock.today && !task.completedAt);
  // У дел на будущие дни видна дата: «завтра», «пт, 16 окт.».
  const dueLabel = $derived(task.dueDate && task.dueDate > clock.today ? formatDue(task.dueDate, clock.today) : '');

  function down(event: PointerEvent) {
    if (leaving || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    mode = '';
    pressed = true;
    longPressed = false;
    clearTimeout(pressTimer);
    if (onopen) {
      pressTimer = setTimeout(() => {
        if (pointerId === -1 || mode) return;
        longPressed = true;
        pressed = false;
        onopen(task);
      }, LONG_PRESS_MS);
    }
  }

  function move(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!mode && !longPressed) {
      if (swipeable && !done && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        mode = 'swipe';
        dragging = true;
        pressed = false;
        try {
          // Палец может уйти со строки — продолжаем получать его движения.
          row?.setPointerCapture(event.pointerId);
        } catch {
          // Захват не удался — свайп всё равно работает, пока палец над строкой.
        }
      } else if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        mode = 'scroll';
        pressed = false;
      }
    }
    if (mode) clearTimeout(pressTimer);
    if (mode === 'swipe') offset = dx;
  }

  function up(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    pointerId = -1;
    pressed = false;
    clearTimeout(pressTimer);
    if (longPressed) {
      // Палец отпустили после долгого нажатия — карточка уже открыта, отметку не ставим.
      longPressed = false;
      mode = '';
      return;
    }
    if (mode === 'swipe') {
      dragging = false;
      if (armed && onswipe) {
        const dir: SwipeDirection = offset > 0 ? 'right' : 'left';
        leaving = true;
        // Строка улетает за край, потом действие — и строка плавно схлопывается.
        offset = (dir === 'right' ? 1 : -1) * ((row?.offsetWidth ?? 440) + 40);
        setTimeout(() => onswipe(task, dir), 200);
      } else {
        offset = 0;
      }
    } else if (!mode) {
      ontoggle(task);
    }
    mode = '';
  }

  function cancel() {
    clearTimeout(pressTimer);
    pointerId = -1;
    pressed = false;
    dragging = false;
    mode = '';
    if (!leaving) offset = 0;
  }

  // Правая кнопка мыши (на компьютере) тоже открывает карточку.
  function contextMenu(event: MouseEvent) {
    if (!onopen) return;
    event.preventDefault();
    if (!longPressed) onopen(task);
  }

  function key(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      ontoggle(task);
    }
  }
</script>

<li class="row" data-task-id={task.id} transition:slide={{ duration: animate ? 320 : 0 }}>
  {#if swipeable}
    <div class="swipe" data-dir={direction} class:armed aria-hidden="true">
      <span class="action tomorrow">
        <svg viewBox="0 0 24 24"><path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" /></svg>
        Завтра
      </span>
      <span class="action delete">
        Удалить
        <svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></svg>
      </span>
    </div>
  {/if}
  <div
    bind:this={row}
    class="task"
    class:done
    class:pressed
    class:dragging
    data-pr={task.priority}
    style:transform={offset ? `translateX(${offset}px)` : undefined}
    role="checkbox"
    aria-checked={done}
    tabindex="0"
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={cancel}
    oncontextmenu={contextMenu}
    onkeydown={key}
  >
    <span class="chk" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle class="ring" cx="12" cy="12" r="10" />
        <circle class="fill" cx="12" cy="12" r="10" />
        <path class="tick" d="M7.5 12.4l3.1 3.1 6-6.6" />
      </svg>
    </span>
    <span class="body">
      <span class="txt"><span class="strike">{task.title}</span></span>
      {#if overdueLabel || dueLabel || task.dueTime || task.notes || deadlineLabel || subtasks?.total}
        <span class="meta">
          {#if overdueLabel}<span class="overdue">{overdueLabel}</span>{/if}
          {#if dueLabel}<span>{dueLabel}</span>{/if}
          {#if task.dueTime}<span>{task.dueTime}</span>{/if}
          {#if deadlineLabel}<span class:overdue={deadlineUrgent}>{deadlineLabel}</span>{/if}
          {#if subtasks?.total}
            <span class="subs">
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.6 4.4l1.3 1.3 2.4-2.5M2.6 10.6l1.3 1.3 2.4-2.5M8.6 4.6h5M8.6 10.8h5" /></svg>
              {subtasks.done} из {subtasks.total}
            </span>
          {/if}
          {#if task.notes}
            <span class="note" title="Заметка">{task.notes}</span>
          {/if}
        </span>
      {/if}
    </span>
    {#if restorable}
      <span class="restore">Вернуть</span>
    {/if}
  </div>
</li>

<style>
  .row {
    position: relative;
    overflow: hidden;
  }

  /* Подложка свайпа: золотая «Завтра» справа налево, бордовая «Удалить» слева направо. */
  .swipe {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-inline: 22px;
    font: 600 15px/1 var(--font-ui);
  }

  .swipe[data-dir='right'] {
    background: var(--gilt);
    color: var(--on-gilt);
  }

  .swipe[data-dir='left'] {
    background: var(--danger);
    color: var(--on-danger);
  }

  .action {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.15s, transform 0.2s;
  }

  .action svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .swipe[data-dir='right'] .tomorrow,
  .swipe[data-dir='left'] .delete {
    opacity: 0.6;
  }

  .swipe.armed .action {
    transform: scale(1.06);
  }

  .swipe.armed[data-dir='right'] .tomorrow,
  .swipe.armed[data-dir='left'] .delete {
    opacity: 1;
  }

  .task {
    --pc: var(--fg-3);
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 52px;
    padding: 9px 20px;
    background: var(--bg);
    cursor: pointer;
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    transition: transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.15s;
  }

  .task.dragging {
    transition: background-color 0.15s;
  }

  .task.pressed {
    background: color-mix(in srgb, var(--fg) 5%, var(--bg));
  }

  .task[data-pr='1'] {
    --pc: var(--p1);
  }

  .task[data-pr='2'] {
    --pc: var(--p2);
  }

  .task[data-pr='3'] {
    --pc: var(--p3);
  }

  /* Тонкий разделитель от начала текста до края, как в списках iOS. */
  .task::after {
    content: '';
    position: absolute;
    left: 58px;
    right: 0;
    bottom: 0;
    height: 1px;
    background: var(--line);
  }

  .row:last-child .task::after {
    display: none;
  }

  .chk {
    flex: none;
    width: 24px;
    height: 24px;
  }

  .chk svg {
    display: block;
    width: 24px;
    height: 24px;
    overflow: visible;
  }

  .ring {
    fill: color-mix(in srgb, var(--pc) 9%, transparent);
    stroke: var(--pc);
    stroke-width: 1.6;
    transition: stroke 0.25s;
  }

  .task[data-pr='0'] .ring {
    fill: none;
  }

  /* Кружок заполняется с лёгкой пружинкой, следом прорисовывается галочка. */
  .fill {
    fill: var(--accent);
    transform: scale(0);
    transform-origin: center;
    transform-box: fill-box;
    transition: transform 0.28s cubic-bezier(0.3, 1.45, 0.5, 1);
  }

  .tick {
    fill: none;
    stroke: var(--on-accent);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 14;
    stroke-dashoffset: 14;
    transition: stroke-dashoffset 0.22s ease 0.12s;
  }

  .done .ring {
    stroke: var(--accent);
  }

  .done .fill {
    transform: scale(1);
  }

  .done .tick {
    stroke-dashoffset: 0;
  }

  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .txt {
    font: 400 17px/1.32 var(--font-ui);
    color: var(--fg);
    overflow-wrap: anywhere;
    transition: opacity 0.32s ease;
  }

  /* Неспешная золотистая линия (вариант C): тянется слева направо, на длинном тексте — по всем строкам. */
  .strike {
    background-image: linear-gradient(var(--strike-color), var(--strike-color));
    background-repeat: no-repeat;
    background-position: 0 58%;
    background-size: 0% var(--strike-w);
    transition: background-size var(--strike-dur) var(--strike-ease);
  }

  .done .strike {
    background-size: 100% var(--strike-w);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font: 400 13px/1.25 var(--font-ui);
    color: var(--fg-2);
    transition: opacity 0.32s ease;
  }

  .done .txt,
  .done .meta {
    opacity: var(--done-opacity);
    transition-delay: calc(var(--strike-dur) * 0.35);
  }

  .overdue {
    color: var(--overdue);
  }

  .subs {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .subs svg {
    width: 13px;
    height: 13px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Начало заметки одной строкой. */
  .note {
    flex: 1 1 100%;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--fg-3);
  }

  .restore {
    flex: none;
    font: 500 14px/1 var(--font-ui);
    color: var(--accent);
  }
</style>
