<script lang="ts">
  import { createTask } from './db/repo';
  import { ui } from './ui.svelte';

  // Черновик сохраняется на каждую букву: если приложение обновится в фоне, текст не пропадёт.
  const DRAFT_KEY = 'folio:draft';

  let text = $state(readDraft());
  let error = $state('');

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

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const title = text.trim();
    if (!title) return;
    // Поле очищается сразу, клавиатура остаётся открытой — можно писать следующее дело.
    text = '';
    saveDraft('');
    error = '';
    try {
      const task = await createTask({ title });
      ui.lastAddedId = task.id;
    } catch {
      text = title;
      saveDraft(title);
      error = 'Не сохранилось. Попробуйте ещё раз.';
    }
  }
</script>

<form class="bar" onsubmit={submit}>
  <div class="field">
    <input
      bind:value={text}
      oninput={() => {
        saveDraft(text);
        error = '';
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
  .bar {
    padding: 8px 12px 10px;
    background: color-mix(in srgb, var(--bg) 86%, transparent);
    -webkit-backdrop-filter: saturate(1.6) blur(20px);
    backdrop-filter: saturate(1.6) blur(20px);
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
