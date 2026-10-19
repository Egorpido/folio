<script lang="ts">
  import { slide } from 'svelte/transition';
  import { SvelteSet } from 'svelte/reactivity';
  import ScreenHeader from '../lib/ScreenHeader.svelte';
  import InstallHint from '../lib/InstallHint.svelte';
  import BackupReminder from '../lib/BackupReminder.svelte';
  import TaskRow, { type SwipeDirection } from '../lib/TaskRow.svelte';
  import { clock } from '../lib/clock.svelte';
  import { ui } from '../lib/ui.svelte';
  import { showToast, hideToast } from '../lib/toasts.svelte';
  import { addDays, formatDayLong } from '../lib/dates';
  import { groupForToday } from '../lib/tasks';
  import { revealInScroller } from '../lib/reveal';
  import { liveActiveTasks } from '../lib/db/queries';
  import { completeTask, deleteTask, restoreTask, uncompleteTask, updateTask } from '../lib/db/repo';
  import type { Task } from '../lib/db/schema';

  // Сколько выполненное дело висит на месте с зачёркиванием, прежде чем уйти в «Выполнено».
  const HOLD_MS = 2600;

  const tasks = liveActiveTasks();
  const lingering = new SvelteSet<string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const groups = $derived(groupForToday($tasks ?? [], clock.today, lingering));
  // Подзадачи по делам: сколько сделано из скольких.
  const subtaskCounts = $derived.by(() => {
    const counts = new Map<string, { done: number; total: number }>();
    for (const t of $tasks ?? []) {
      if (!t.parentId || t.deletedAt) continue;
      const c = counts.get(t.parentId) ?? { done: 0, total: 0 };
      c.total += 1;
      if (t.completedAt) c.done += 1;
      counts.set(t.parentId, c);
    }
    return counts;
  });
  let showDone = $state(false);
  let showUpcoming = $state(false);

  function open(task: Task) {
    ui.editingId = task.id;
  }

  // При открытии список появляется сразу, а анимации включаются только для изменений.
  let animate = $state(false);
  $effect(() => {
    if (!$tasks || animate) return;
    const frame = requestAnimationFrame(() => (animate = true));
    return () => cancelAnimationFrame(frame);
  });

  // Только что добавленное дело должно быть видно над полем ввода.
  $effect(() => {
    const id = ui.lastAddedId;
    void groups;
    if (!id) return;
    const el = document.querySelector<HTMLElement>(`[data-task-id="${id}"]`);
    if (!el) return;
    ui.lastAddedId = '';
    setTimeout(() => revealInScroller(el), 240);
  });

  function release(id: string, delay: number) {
    clearTimeout(timers.get(id));
    timers.set(
      id,
      setTimeout(() => {
        lingering.delete(id);
        timers.delete(id);
      }, delay),
    );
  }

  async function toggle(task: Task) {
    if (task.completedAt) {
      // Снять отметку: строка остаётся на месте, зачёркивание уходит обратно.
      hideToast();
      await uncompleteTask(task.id);
      release(task.id, 1000);
      return;
    }
    lingering.add(task.id);
    await completeTask(task.id);
    release(task.id, HOLD_MS);
    showToast(`Выполнено · ${task.title}`, async () => {
      await uncompleteTask(task.id);
      release(task.id, 1000);
    });
  }

  async function swipe(task: Task, direction: SwipeDirection) {
    if (direction === 'right') {
      const before = { dueDate: task.dueDate, overdueSince: task.overdueSince };
      await updateTask(task.id, { dueDate: addDays(clock.today, 1), overdueSince: undefined });
      showToast('Перенесено на завтра', () => updateTask(task.id, before));
    } else {
      await deleteTask(task.id);
      showToast('Удалено', () => restoreTask(task.id));
    }
  }
</script>

<ScreenHeader title="Сегодня" subtitle={formatDayLong(clock.today)} />
<InstallHint />
<BackupReminder />

{#if groups.overdue.length}
  <section class="group" aria-labelledby="g-overdue">
    <h2 class="group-label overdue" id="g-overdue">Просрочено</h2>
    <ul class="list">
      {#each groups.overdue as task (task.id)}
        <TaskRow {task} {animate} subtasks={subtaskCounts.get(task.id)} ontoggle={toggle} onswipe={swipe} onopen={open} />
      {/each}
    </ul>
  </section>
{/if}

<section class="group" aria-labelledby="g-today">
  <h2 class="group-label" id="g-today">На сегодня</h2>
  {#if groups.today.length}
    <ul class="list">
      {#each groups.today as task (task.id)}
        <TaskRow {task} {animate} subtasks={subtaskCounts.get(task.id)} ontoggle={toggle} onswipe={swipe} onopen={open} />
      {/each}
    </ul>
  {:else if groups.done.length}
    <p class="group-empty">Всё на сегодня сделано. Можно выдохнуть.</p>
  {:else}
    <p class="group-empty">Дел на сегодня нет.</p>
  {/if}
</section>

<section class="group" aria-labelledby="g-inbox">
  <h2 class="group-label" id="g-inbox">Входящие</h2>
  {#if groups.inbox.length}
    <ul class="list">
      {#each groups.inbox as task (task.id)}
        <TaskRow {task} {animate} subtasks={subtaskCounts.get(task.id)} ontoggle={toggle} onswipe={swipe} onopen={open} />
      {/each}
    </ul>
  {:else}
    <p class="group-empty">Пусто. Сюда попадают дела без даты — выбрать «Без даты» можно в карточке дела.</p>
  {/if}
</section>

{#if groups.upcoming.length}
  <section class="group fold-group">
    <button
      type="button"
      class="fold-toggle"
      aria-expanded={showUpcoming}
      aria-controls="upcoming-list"
      onclick={() => (showUpcoming = !showUpcoming)}
    >
      <span>Запланировано</span>
      <span class="count">{groups.upcoming.length}</span>
      <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </button>
    {#if showUpcoming}
      <ul class="list" id="upcoming-list" transition:slide={{ duration: 220 }}>
        {#each groups.upcoming as task (task.id)}
          <TaskRow {task} {animate} subtasks={subtaskCounts.get(task.id)} ontoggle={toggle} onswipe={swipe} onopen={open} />
        {/each}
      </ul>
    {/if}
  </section>
{/if}

{#if groups.done.length}
  <section class="group fold-group">
    <button
      type="button"
      class="fold-toggle"
      aria-expanded={showDone}
      aria-controls="done-list"
      onclick={() => (showDone = !showDone)}
    >
      <span>Выполнено сегодня</span>
      <span class="count">{groups.done.length}</span>
      <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
    </button>
    {#if showDone}
      <ul class="list" id="done-list" transition:slide={{ duration: 220 }}>
        {#each groups.done as task (task.id)}
          <TaskRow {task} {animate} subtasks={subtaskCounts.get(task.id)} swipeable={false} restorable ontoggle={toggle} onopen={open} />
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  .fold-group {
    padding-top: 14px;
  }

  .fold-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 20px;
    font: 500 15px/1 var(--font-ui);
    color: var(--fg-2);
  }

  .count {
    min-width: 22px;
    padding: 3px 7px;
    border-radius: 11px;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .chev {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.25s;
  }

  .fold-toggle[aria-expanded='true'] .chev {
    transform: rotate(90deg);
  }
</style>
