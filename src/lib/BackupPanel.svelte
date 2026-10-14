<script lang="ts">
  import { slide } from 'svelte/transition';
  import { backup, saveBackup } from './backup.svelte';
  import { parseBackup } from './backup';
  import { importTasks, restoreSnapshot } from './db/repo';
  import type { Task } from './db/schema';
  import { showToast } from './toasts.svelte';
  import { formatAgo, plural } from './format';

  const TASK_FORMS: [string, string, string] = ['дело', 'дела', 'дел'];
  const dateTime = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

  // $state.raw: данные из файла уходят в базу как есть. Обычный $state обернул бы их в Proxy,
  // а IndexedDB такие объекты сохранить не может (DataCloneError).
  let pending = $state.raw<{ tasks: Task[]; exportedAt?: string; skipped: number } | null>(null);
  let error = $state('');
  let busy = $state(false);

  const pendingCount = $derived(pending ? pending.tasks.filter((t) => !t.deletedAt).length : 0);

  async function pick(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    error = '';
    pending = null;
    if (!file) return;
    const result = parseBackup(await file.text());
    if (result.ok) pending = result;
    else error = result.error;
  }

  async function apply(mode: 'merge' | 'replace') {
    if (!pending || busy) return;
    busy = true;
    try {
      const result = await importTasks(pending.tasks, mode);
      pending = null;
      const parts = [
        result.added && `добавлено ${result.added}`,
        result.updated && `обновлено ${result.updated}`,
        result.removed && `убрано ${result.removed}`,
      ].filter(Boolean);
      showToast(parts.length ? `Восстановлено: ${parts.join(', ')}` : 'Всё уже было на месте', () =>
        restoreSnapshot(result.snapshot),
      );
    } catch (e) {
      console.error('Восстановление из копии не удалось', e);
      error = 'Не получилось восстановить. Текущие дела не изменились.';
    } finally {
      busy = false;
    }
  }
</script>

<section class="group" aria-labelledby="g-backup">
  <h2 class="group-label" id="g-backup">Резервная копия</h2>
  <div class="card">
    <div class="row">
      <span>Последняя копия</span>
      <span class="value">{backup.lastAt ? formatAgo(backup.lastAt, backup.now) : 'ещё не было'}</span>
    </div>
    <div class="actions">
      <button type="button" class="primary" onclick={saveBackup}>Сохранить копию</button>
      <label class="secondary">
        Восстановить из файла
        <input type="file" class="file" aria-label="Выбрать файл копии" onchange={pick} />
      </label>
    </div>
  </div>

  {#if pending}
    <div class="confirm" transition:slide={{ duration: 220 }}>
      <p class="title">
        В файле {plural(pendingCount, TASK_FORMS)}{pending.exportedAt
          ? ` · копия от ${dateTime.format(new Date(pending.exportedAt))}`
          : ''}
      </p>
      {#if pending.skipped}
        <p class="text">Записей с ошибками, которые будут пропущены: {pending.skipped}.</p>
      {/if}
      <p class="text">
        «Объединить» добавит дела из файла к текущим; если дело есть и там и тут, останется более свежая версия.
        «Заменить всё» сделает дела точно как в файле. Сразу после восстановления его можно отменить.
      </p>
      <div class="buttons">
        <button type="button" class="primary" disabled={busy} onclick={() => apply('merge')}>Объединить</button>
        <button type="button" class="replace" disabled={busy} onclick={() => apply('replace')}>Заменить всё</button>
        <button type="button" class="cancel" onclick={() => (pending = null)}>Отмена</button>
      </div>
    </div>
  {/if}

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  <p class="group-note">
    Копия — это файл со всеми делами. Нажмите «Сохранить копию», затем «Сохранить в Файлы» и выберите iCloud Drive:
    так дела переживут даже удаление приложения. Folio напомнит о копии раз в неделю.
  </p>
</section>

<style>
  .card {
    margin: 4px 16px 0;
    padding: 4px 16px 16px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--surface);
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding: 12px 0 14px;
    font-size: 16px;
    color: var(--fg);
  }

  .value {
    color: var(--fg-2);
    text-align: right;
  }

  .actions {
    display: grid;
    gap: 8px;
  }

  .primary,
  .secondary {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 46px;
    border-radius: 23px;
    font: 600 16px/1 var(--font-ui);
    cursor: pointer;
  }

  .primary {
    background: var(--accent);
    color: var(--on-accent);
  }

  .secondary {
    border: 1px solid var(--line);
    color: var(--accent);
    font-weight: 500;
  }

  /* Невидимое системное поле поверх кнопки: нажатие открывает выбор файла iPhone. */
  .file {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .confirm {
    margin: 10px 16px 0;
    padding: 16px;
    border: 1px solid var(--accent);
    border-radius: 16px;
    background: var(--accent-soft);
  }

  .title {
    margin: 0 0 6px;
    font: 600 16px/1.35 var(--font-ui);
    color: var(--fg);
  }

  .text {
    margin: 0 0 8px;
    font-size: 14px;
    line-height: 1.45;
    color: var(--fg-2);
  }

  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }

  .buttons .primary {
    min-height: 40px;
    padding: 0 18px;
    border-radius: 20px;
    font-size: 15px;
  }

  .replace {
    min-height: 40px;
    padding: 0 16px;
    border-radius: 20px;
    border: 1px solid var(--danger);
    color: var(--danger);
    font: 500 15px/1 var(--font-ui);
  }

  .cancel {
    min-height: 40px;
    padding: 0 12px;
    color: var(--fg-2);
    font: 500 15px/1 var(--font-ui);
  }

  button:disabled {
    opacity: 0.5;
  }

  .error {
    margin: 10px 20px 0;
    font-size: 14px;
    line-height: 1.4;
    color: var(--overdue);
  }
</style>
