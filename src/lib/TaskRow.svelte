<script lang="ts">
  import { slide } from 'svelte/transition';
  import type { Task } from './db/schema';
  import { clock } from './clock.svelte';
  import { formatDayShort } from './dates';

  let { task, animate = false }: { task: Task; animate?: boolean } = $props();

  const overdueLabel = $derived(
    task.dueDate && task.dueDate < clock.today ? formatDayShort(task.dueDate, clock.today) : '',
  );
</script>

<li class="task" data-task-id={task.id} data-pr={task.priority} in:slide={{ duration: animate ? 220 : 0 }}>
  <span class="chk" aria-hidden="true">
    <svg viewBox="0 0 24 24"><circle class="ring" cx="12" cy="12" r="10" /></svg>
  </span>
  <span class="body">
    <span class="title">{task.title}</span>
    {#if overdueLabel || task.dueTime}
      <span class="meta">
        {#if overdueLabel}<span class="overdue">{overdueLabel}</span>{/if}
        {#if task.dueTime}<span>{task.dueTime}</span>{/if}
      </span>
    {/if}
  </span>
</li>

<style>
  .task {
    --pc: var(--fg-3);
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 52px;
    padding: 9px 20px;
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

  .task:last-child::after {
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
  }

  .task[data-pr='0'] .ring {
    fill: none;
  }

  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .title {
    font: 400 17px/1.32 var(--font-ui);
    color: var(--fg);
    overflow-wrap: anywhere;
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font: 400 13px/1.25 var(--font-ui);
    color: var(--fg-2);
  }

  .overdue {
    color: var(--overdue);
  }
</style>
