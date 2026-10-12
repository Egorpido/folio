<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { liveQuery } from 'dexie';
  import { db } from './db/db';
  import { deleteTask, restoreTask, updateTask, type Patch } from './db/repo';
  import type { Priority, Task } from './db/schema';
  import { clock } from './clock.svelte';
  import { ui } from './ui.svelte';
  import { viewport } from './viewport.svelte';
  import { showToast } from './toasts.svelte';
  import { addDays, capitalize, formatDue, nextMonday, weekendStart } from './dates';
  import { PRIORITIES } from './priority';

  let { id }: { id: string } = $props();

  // Карточка открывается заново для каждого дела ({#key} в App.svelte), поэтому id не меняется.
  // svelte-ignore state_referenced_locally
  const taskStore = liveQuery(() => db.tasks.get(id));
  const task = $derived($taskStore);

  let title = $state('');
  let notes = $state('');
  let ready = $state(false);
  $effect(() => {
    if (task && !ready) {
      title = task.title;
      notes = task.notes ?? '';
      ready = true;
    }
  });

  const quickDates = $derived.by(() => {
    const options: { label: string; value?: string }[] = [
      { label: 'Без даты' },
      { label: 'Сегодня', value: clock.today },
      { label: 'Завтра', value: addDays(clock.today, 1) },
      { label: 'Выходные', value: weekendStart(clock.today) },
      { label: 'След. неделя', value: nextMonday(clock.today) },
    ];
    // В субботу «Выходные» совпадают с «Сегодня» — повтор не показываем.
    return options.filter((o, i) => options.findIndex((x) => x.value === o.value) === i);
  });
  const customDate = $derived(
    task?.dueDate && !quickDates.some((o) => o.value === task.dueDate) ? task.dueDate : undefined,
  );

  function save(patch: Patch<Task>) {
    void updateTask(id, patch);
  }

  // Явный перенос снимает отметку «просрочено».
  function setDate(value: string | undefined) {
    save(value ? { dueDate: value, overdueSince: undefined } : { dueDate: undefined, dueTime: undefined, overdueSince: undefined });
  }

  // Время без даты не имеет смысла: если даты нет, ставим сегодня.
  function setTime(value: string) {
    save(value ? { dueTime: value, dueDate: task?.dueDate ?? clock.today } : { dueTime: undefined });
  }

  function setPriority(value: Priority) {
    save({ priority: value });
  }

  async function saveText(): Promise<void> {
    if (!task) return;
    const patch: Patch<Task> = {};
    const t = title.trim();
    if (t && t !== task.title) patch.title = t;
    const n = notes.trim();
    if (n !== (task.notes ?? '')) patch.notes = n || undefined;
    if (Object.keys(patch).length) await updateTask(id, patch);
  }

  async function close() {
    await saveText();
    ui.editingId = '';
  }

  async function remove() {
    ui.editingId = '';
    await deleteTask(id);
    showToast('Удалено', () => restoreTask(id));
  }

  // Заголовок растёт по высоте вместе с текстом.
  function autogrow(node: HTMLTextAreaElement, _value: string) {
    const resize = () => {
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight}px`;
    };
    resize();
    return { update: resize };
  }

  // Карточку можно смахнуть вниз за полоску сверху.
  let dragY = $state(0);
  let dragging = $state(false);
  let dragStart = 0;
  let dragPointer = -1;
  // Протянули полоску — значит, это не нажатие «закрыть».
  let dragMoved = false;

  function dragDown(event: PointerEvent) {
    dragPointer = event.pointerId;
    dragStart = event.clientY;
    dragging = true;
    dragMoved = false;
    try {
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
    } catch {
      // Без захвата тоже работает, пока палец над полоской.
    }
  }

  function dragMove(event: PointerEvent) {
    if (event.pointerId !== dragPointer) return;
    dragY = Math.max(0, event.clientY - dragStart);
    if (dragY > 6) dragMoved = true;
  }

  function dragEnd(event: PointerEvent) {
    if (event.pointerId !== dragPointer) return;
    dragPointer = -1;
    dragging = false;
    if (dragY > 110) void close();
    else dragY = 0;
  }

  const keyboard = $derived(viewport.keyboardOpen ? viewport.keyboard : 0);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<button type="button" class="backdrop" aria-label="Закрыть карточку" transition:fade={{ duration: 200 }} onclick={close}
></button>

<div class="lift" style:--kb="{keyboard}px">
  <div
    class="sheet"
    class:dragging
    class:kb={keyboard > 0}
    role="dialog"
    aria-modal="true"
    aria-label="Карточка дела"
    data-scroll
    style:transform={dragY ? `translateY(${dragY}px)` : undefined}
    transition:fly={{ y: 700, duration: 320, opacity: 1 }}
  >
    <button
      type="button"
      class="handle"
      aria-label="Закрыть карточку"
      onpointerdown={dragDown}
      onpointermove={dragMove}
      onpointerup={dragEnd}
      onpointercancel={dragEnd}
      onclick={() => {
        if (!dragMoved) void close();
      }}
    >
      <span></span>
    </button>

    {#if task}
      <textarea
        class="title"
        bind:value={title}
        use:autogrow={title}
        rows="1"
        enterkeyhint="done"
        maxlength="500"
        aria-label="Текст дела"
        onblur={saveText}
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      ></textarea>

      <section>
        <h3 class="label">Когда</h3>
        <div class="chips">
          {#each quickDates as option (option.label)}
            <button
              type="button"
              class="chip"
              aria-pressed={task.dueDate === option.value}
              onclick={() => setDate(option.value)}
            >
              {option.label}
            </button>
          {/each}
          <label class="chip pick" aria-pressed={!!customDate}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>
            {customDate ? capitalize(formatDue(customDate, clock.today)) : 'Дата…'}
            <input
              type="date"
              value={task.dueDate ?? ''}
              aria-label="Выбрать дату"
              onchange={(e) => setDate(e.currentTarget.value || undefined)}
            />
          </label>
        </div>
      </section>

      <section>
        <h3 class="label">Время</h3>
        <div class="chips">
          <label class="chip pick" aria-pressed={!!task.dueTime}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 1.5" /></svg>
            {task.dueTime ?? 'Указать время'}
            <input
              type="time"
              value={task.dueTime ?? ''}
              aria-label="Выбрать время"
              onchange={(e) => setTime(e.currentTarget.value)}
            />
          </label>
          {#if task.dueTime}
            <button type="button" class="chip" onclick={() => setTime('')}>Без времени</button>
          {/if}
        </div>
      </section>

      <section>
        <h3 class="label">Важность</h3>
        <div class="priorities">
          {#each PRIORITIES as p (p.value)}
            <button
              type="button"
              class="priority"
              data-pr={p.value}
              aria-pressed={task.priority === p.value}
              onclick={() => setPriority(p.value)}
            >
              <i aria-hidden="true"></i>
              {p.name}
            </button>
          {/each}
        </div>
      </section>

      <section>
        <h3 class="label">Заметка</h3>
        <textarea class="notes" bind:value={notes} rows="3" placeholder="Подробности, ссылки, мысли…" onblur={saveText}
        ></textarea>
      </section>

      <footer>
        <button type="button" class="delete" onclick={remove}>Удалить</button>
        <button type="button" class="done" onclick={close}>Готово</button>
      </footer>
    {/if}
  </div>
</div>

<style>
  .backdrop {
    position: absolute;
    inset: 0;
    z-index: 40;
    background: rgba(8, 10, 22, 0.38);
    border: 0;
    padding: 0;
  }

  /* Поднимается над клавиатурой, когда пишешь в карточке. */
  .lift {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 41;
    transform: translateY(calc(-1 * var(--kb, 0px)));
    transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    pointer-events: none;
  }

  .sheet {
    pointer-events: auto;
    max-width: 560px;
    max-height: calc(var(--vvh, 100vh) - env(safe-area-inset-top, 0px) - 32px);
    margin-inline: auto;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0 20px calc(env(safe-area-inset-bottom, 0px) + 16px);
    border-radius: 22px 22px 0 0;
    background: var(--surface);
    box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.18);
    transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .sheet.kb {
    padding-bottom: 14px;
  }

  .sheet.dragging {
    transition: none;
  }

  .handle {
    display: grid;
    place-items: center;
    width: calc(100% + 40px);
    height: 28px;
    margin-inline: -20px;
    touch-action: none;
    cursor: grab;
  }

  .handle span {
    width: 38px;
    height: 5px;
    border-radius: 3px;
    background: var(--line);
  }

  .title {
    display: block;
    width: 100%;
    padding: 2px 0 10px;
    border: 0;
    outline: none;
    resize: none;
    overflow: hidden;
    background: transparent;
    color: var(--fg);
    font: 600 21px/1.3 var(--font-ui);
  }

  section {
    padding-top: 14px;
  }

  .label {
    margin: 0 0 8px;
    font: 600 11px/1.2 var(--font-ui);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--fg-3);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 13px;
    border-radius: 18px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--fg);
    font: 500 14px/1 var(--font-ui);
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s, color 0.15s;
  }

  .chip[aria-pressed='true'] {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
  }

  .chip svg {
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  /* Невидимое системное поле поверх кнопки: нажатие открывает календарь или часы iPhone. */
  .pick input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    border: 0;
    cursor: pointer;
  }

  .priorities {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .priority {
    --pc: var(--fg-3);
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid var(--line);
    font: 500 15px/1.2 var(--font-ui);
    color: var(--fg);
    text-align: left;
  }

  .priority[data-pr='1'] {
    --pc: var(--p1);
  }

  .priority[data-pr='2'] {
    --pc: var(--p2);
  }

  .priority[data-pr='3'] {
    --pc: var(--p3);
  }

  .priority i {
    flex: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.6px solid var(--pc);
    background: color-mix(in srgb, var(--pc) 9%, transparent);
  }

  .priority[aria-pressed='true'] {
    border-color: var(--pc);
    background: color-mix(in srgb, var(--pc) 10%, transparent);
  }

  .notes {
    display: block;
    width: 100%;
    min-height: 84px;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 12px;
    outline: none;
    resize: none;
    background: var(--bg);
    color: var(--fg);
    font: 400 16px/1.4 var(--font-ui);
  }

  .notes:focus {
    border-color: var(--accent);
  }

  footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding-top: 20px;
  }

  .delete {
    min-height: 44px;
    padding: 0 6px;
    font: 500 16px/1 var(--font-ui);
    color: var(--danger);
  }

  .done {
    min-height: 46px;
    padding: 0 26px;
    border-radius: 23px;
    background: var(--accent);
    color: var(--on-accent);
    font: 600 16px/1 var(--font-ui);
  }
</style>
