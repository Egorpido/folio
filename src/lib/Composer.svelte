<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { createTask, deleteTask } from './db/repo';
  import { ui } from './ui.svelte';
  import { clock } from './clock.svelte';
  import { showToast } from './toasts.svelte';
  import { parseTask, type TokenKind } from './parse';
  import { capitalize, formatDue } from './dates';
  import { priorityName } from './priority';

  // Черновик сохраняется на каждую букву: если приложение обновится в фоне, текст не пропадёт.
  const DRAFT_KEY = 'folio:draft';

  let text = $state(readDraft());
  let error = $state('');

  // Что пользователь попросил считать обычным текстом (нажал на подсказку).
  const ignored = new SvelteSet<TokenKind>();
  const parsed = $derived(parseTask(text, clock.today, ignored));
  // Всё, что можно распознать, — чтобы подсказку можно было и выключить, и включить обратно.
  const detected = $derived(parseTask(text, clock.today));

  const hints = $derived(
    [...new Set(detected.found.map((t) => t.kind))].map((kind) => ({
      kind,
      active: !ignored.has(kind),
      label:
        kind === 'date'
          ? capitalize(formatDue(detected.dueDate ?? clock.today, clock.today))
          : kind === 'time'
            ? (detected.dueTime ?? '')
            : priorityName(detected.priority),
    })),
  );

  function readDraft(): string {
    try {
      return localStorage.getItem(DRAFT_KEY) ?? '';
    } catch {
      return '';
    }
  }

  function saveDraft(value: string): void {
    try {
      if (value) localStorage.setItem(DRAFT_KEY, value);
      else localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Без черновика тоже можно работать.
    }
  }

  function toggleHint(kind: TokenKind) {
    if (ignored.has(kind)) ignored.delete(kind);
    else ignored.add(kind);
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const raw = text.trim();
    if (!raw) return;
    const { title, dueDate, dueTime, priority } = parsed;
    // Поле очищается сразу, клавиатура остаётся открытой — можно писать следующее дело.
    text = '';
    saveDraft('');
    ignored.clear();
    error = '';
    try {
      const task = await createTask({ title, dueDate, dueTime, priority });
      if (dueDate && dueDate > clock.today) {
        // Дела на будущие дни не видны в «Сегодня» — сообщаем, куда дело ушло.
        const when = formatDue(dueDate, clock.today) + (dueTime ? `, ${dueTime}` : '');
        showToast(`Запланировано на ${when}`, () => deleteTask(task.id));
      } else {
        ui.lastAddedId = task.id;
      }
    } catch {
      text = raw;
      saveDraft(raw);
      error = 'Не сохранилось. Попробуйте ещё раз.';
    }
  }
</script>

<form class="bar" onsubmit={submit}>
  {#if hints.length}
    <div class="hints" aria-label="Распознано в тексте">
      {#each hints as hint (hint.kind)}
        <!-- Нажатие: считать это слово обычным текстом (или вернуть распознавание). -->
        <button
          type="button"
          class="hint"
          class:off={!hint.active}
          data-kind={hint.kind}
          data-pr={hint.kind === 'priority' ? detected.priority : undefined}
          aria-pressed={hint.active}
          onpointerdown={(e) => e.preventDefault()}
          onclick={() => toggleHint(hint.kind)}
        >
          {#if hint.kind === 'date'}
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>
          {:else if hint.kind === 'time'}
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 1.5" /></svg>
          {:else}
            <i class="dot" aria-hidden="true"></i>
          {/if}
          {hint.label}
        </button>
      {/each}
    </div>
  {/if}
  <div class="field">
    <input
      bind:value={text}
      oninput={() => {
        saveDraft(text);
        error = '';
        if (!text.trim()) ignored.clear();
      }}
      onfocus={() => (ui.composing = true)}
      onblur={() => (ui.composing = false)}
      type="text"
      name="title"
      placeholder="Новое дело…"
      enterkeyhint="enter"
      autocomplete="off"
      maxlength="500"
      aria-label="Новое дело"
    />
    <!-- preventDefault на нажатии: кнопка не забирает фокус, и клавиатура не прячется. -->
    <button
      type="submit"
      class="send"
      disabled={!text.trim()}
      aria-label="Добавить дело"
      onpointerdown={(e) => e.preventDefault()}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18.5V6M6.5 11.5L12 6l5.5 5.5" /></svg>
    </button>
  </div>
  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}
</form>

<style>
  /* Сплошной фон без размытия: панель двигается вместе с клавиатурой, и размытие
     в каждом кадре движения было бы лишней работой для телефона. */
  .bar {
    padding: 8px 12px 10px;
    background: var(--bg);
  }

  .hints {
    max-width: 536px;
    margin: 0 auto 8px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-inline: 4px;
  }

  .hint {
    --pc: var(--fg-3);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 11px;
    border-radius: 14px;
    background: var(--accent-soft);
    color: var(--accent);
    font: 500 13px/1 var(--font-ui);
    transition: background-color 0.15s, color 0.15s;
  }

  .hint.off {
    background: var(--sunk);
    color: var(--fg-3);
    text-decoration: line-through;
  }

  .hint svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .hint[data-pr='1'] {
    --pc: var(--p1);
  }

  .hint[data-pr='2'] {
    --pc: var(--p2);
  }

  .hint[data-pr='3'] {
    --pc: var(--p3);
  }

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--pc);
  }

  .field {
    max-width: 536px;
    margin-inline: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 5px 5px 16px;
    border-radius: 24px;
    background: var(--surface);
    border: 1px solid var(--line);
    transition: border-color 0.2s;
  }

  .field:focus-within {
    border-color: var(--accent);
  }

  input {
    flex: 1;
    min-width: 0;
    height: 38px;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--fg);
    font: 400 17px/1.2 var(--font-ui);
  }

  input::placeholder {
    color: var(--fg-3);
  }

  .send {
    flex: none;
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--on-accent);
    transition: opacity 0.2s;
  }

  .send:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .send svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .error {
    max-width: 536px;
    margin: 6px auto 0;
    padding-inline: 8px;
    font-size: 13px;
    color: var(--overdue);
  }
</style>
