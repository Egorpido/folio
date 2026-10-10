<script lang="ts">
  import ScreenHeader from '../lib/ScreenHeader.svelte';
  import InstallHint from '../lib/InstallHint.svelte';
  import TaskRow from '../lib/TaskRow.svelte';
  import { clock } from '../lib/clock.svelte';
  import { ui } from '../lib/ui.svelte';
  import { formatDayLong } from '../lib/dates';
  import { groupForToday } from '../lib/tasks';
  import { revealAboveDock } from '../lib/reveal';
  import { liveOpenTasks } from '../lib/db/queries';

  const tasks = liveOpenTasks();
  const groups = $derived(groupForToday($tasks ?? [], clock.today));

  // При открытии список появляется сразу, а анимация включается только для новых дел.
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
    const el = document.querySelector(`[data-task-id="${id}"]`);
    if (!el) return;
    ui.lastAddedId = '';
    setTimeout(() => revealAboveDock(el, ui.dockCover), 240);
  });
</script>

<ScreenHeader title="Сегодня" subtitle={formatDayLong(clock.today)} />
<InstallHint />

{#if groups.overdue.length}
  <section class="group" aria-labelledby="g-overdue">
    <h2 class="group-label overdue" id="g-overdue">Просрочено</h2>
    <ul class="list">
      {#each groups.overdue as task (task.id)}
        <TaskRow {task} {animate} />
      {/each}
    </ul>
  </section>
{/if}

<section class="group" aria-labelledby="g-today">
  <h2 class="group-label" id="g-today">На сегодня</h2>
  {#if groups.today.length}
    <ul class="list">
      {#each groups.today as task (task.id)}
        <TaskRow {task} {animate} />
      {/each}
    </ul>
  {:else}
    <p class="group-empty">Дел на сегодня нет.</p>
  {/if}
</section>

<section class="group" aria-labelledby="g-inbox">
  <h2 class="group-label" id="g-inbox">Входящие</h2>
  {#if groups.inbox.length}
    <ul class="list">
      {#each groups.inbox as task (task.id)}
        <TaskRow {task} {animate} />
      {/each}
    </ul>
  {:else}
    <p class="group-empty">Пусто. Напишите дело в поле внизу и нажмите Enter.</p>
  {/if}
</section>
