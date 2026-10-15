<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { ai } from './ai.svelte';
  import type { AiTask } from './extract';
  import { createTask, deleteTask } from '../db/repo';
  import { clock } from '../clock.svelte';
  import { capitalize, formatDue } from '../dates';
  import { priorityName } from '../priority';
  import { showToast } from '../toasts.svelte';
  import { plural } from '../format';

  // Копия списка для правки: снятые галочки и исправленные названия.
  // svelte-ignore state_referenced_locally
  let items = $state((ai.drafts ?? []).map((task) => ({ ...task, keep: true })));
  const chosen = $derived(items.filter((t) => t.keep && t.title.trim()));

  function close() {
    ai.drafts = null;
  }

  async function addAll() {
    const ids: string[] = [];
    for (const item of chosen) {
      const task: AiTask = { ...item, title: item.title.trim() };
      const created = await createTask({
        title: task.title,
        // Дело без даты сразу ставится на сегодня.
        dueDate: task.dueDate ?? clock.today,
        dueTime: task.dueTime,
        priority: task.priority,
        notes: task.notes,
      });
      ids.push(created.id);
    }
    ai.drafts = null;
    ai.added += 1;
    showToast(`Добавлено ${plural(ids.length, ['дело', 'дела', 'дел'])}`, async () => {
      for (const id of ids) await deleteTask(id);
    });
  }
</script>

<button type="button" class="backdrop" aria-label="Закрыть" transition:fade={{ duration: 200 }} onclick={close}></button>

<div class="sheet" role="dialog" aria-modal="true" aria-label="Проверка найденных дел" data-scroll transition:fly={{ y: 700, duration: 320, opacity: 1 }}>
  <h2>Нашлось {plural(items.length, ['дело', 'дела', 'дел'])}</h2>
  <p class="hint">Снимите галочку с лишнего и поправьте текст, если нужно. Даты и важность потом можно изменить в карточке дела.</p>

  {#if items.length === 0}
    <p class="empty">ИИ не нашёл в тексте дел. Попробуйте сформулировать иначе.</p>
  {/if}

  <ul>
    {#each items as item, i (i)}
      <li class:off={!item.keep}>
        <button
          type="button"
          class="tick"
          role="checkbox"
          aria-checked={item.keep}
          aria-label={item.keep ? 'Не добавлять' : 'Добавить'}
          onclick={() => (item.keep = !item.keep)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 12.4l3.1 3.1 6-6.6" /></svg>
        </button>
        <div class="body">
          <input class="title" bind:value={item.title} aria-label="Текст дела" maxlength="500" />
          <p class="meta">
              <!-- Без даты дело встанет на сегодня — так и показываем. -->
              <span>{capitalize(formatDue(item.dueDate ?? clock.today, clock.today))}</span>
              {#if item.dueTime}<span>{item.dueTime}</span>{/if}
              {#if item.priority}<span class="pr" data-pr={item.priority}>{priorityName(item.priority)}</span>{/if}
              {#if item.notes}<span class="notes">{item.notes}</span>{/if}
          </p>
        </div>
      </li>
    {/each}
  </ul>

  <footer>
    <button type="button" class="cancel" onclick={close}>Отмена</button>
    <button type="button" class="add" disabled={!chosen.length} onclick={addAll}>
      Добавить {chosen.length || ''}
    </button>
  </footer>
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

  .sheet {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 41;
    max-width: 560px;
    max-height: calc(var(--vvh, 100vh) - env(safe-area-inset-top, 0px) - 32px);
    margin-inline: auto;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 20px 20px calc(env(safe-area-inset-bottom, 0px) + 16px);
    border-radius: 22px 22px 0 0;
    background: var(--surface);
    box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.18);
  }

  h2 {
    margin: 0;
    font-family: var(--font-head);
    font-weight: var(--head-weight);
    font-size: 24px;
    color: var(--fg);
  }

  .hint,
  .empty {
    margin: 6px 0 10px;
    font-size: 14px;
    line-height: 1.4;
    color: var(--fg-2);
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 10px 0;
    border-bottom: 1px solid var(--line);
    transition: opacity 0.2s;
  }

  li.off {
    opacity: 0.4;
  }

  .tick {
    flex: none;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    margin-top: 6px;
    border-radius: 50%;
    border: 1.6px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
  }

  li.off .tick {
    background: transparent;
    color: transparent;
    border-color: var(--fg-3);
  }

  .tick svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .body {
    flex: 1;
    min-width: 0;
  }

  .title {
    width: 100%;
    padding: 6px 0;
    border: 0;
    border-bottom: 1px solid transparent;
    outline: none;
    background: transparent;
    color: var(--fg);
    font: 400 17px/1.3 var(--font-ui);
  }

  .title:focus {
    border-bottom-color: var(--accent);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin: 2px 0 0;
    font-size: 13px;
    color: var(--fg-2);
  }

  .pr[data-pr='1'] {
    color: var(--p1);
  }

  .pr[data-pr='2'] {
    color: var(--p2);
  }

  .pr[data-pr='3'] {
    color: var(--p3);
  }

  .notes {
    flex-basis: 100%;
    color: var(--fg-3);
  }

  footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
  }

  .cancel {
    min-height: 44px;
    padding: 0 6px;
    font: 500 16px/1 var(--font-ui);
    color: var(--fg-2);
  }

  .add {
    min-height: 46px;
    padding: 0 26px;
    border-radius: 23px;
    background: var(--accent);
    color: var(--on-accent);
    font: 600 16px/1 var(--font-ui);
  }

  .add:disabled {
    opacity: 0.4;
  }
</style>
