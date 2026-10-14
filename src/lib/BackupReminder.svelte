<script lang="ts">
  import { slide } from 'svelte/transition';
  import { backup, isBackupDue, saveBackup, snoozeBackup } from './backup.svelte';
  import { formatAgo } from './format';

  const due = $derived(isBackupDue());
</script>

{#if due}
  <aside class="reminder" aria-label="Напоминание о резервной копии" transition:slide={{ duration: 240 }}>
    <p class="title">Пора сохранить копию дел</p>
    <p class="text">
      {backup.lastAt ? `Последняя копия — ${formatAgo(backup.lastAt, backup.now)}.` : 'Копию дел вы ещё не сохраняли.'}
      Сохраните файл в «Файлы» → iCloud Drive: так дела переживут даже удаление приложения.
    </p>
    <div class="actions">
      <button type="button" class="primary" onclick={saveBackup}>Сохранить копию</button>
      <button type="button" class="later" onclick={snoozeBackup}>Позже</button>
    </div>
  </aside>
{/if}

<style>
  .reminder {
    position: relative;
    margin: 14px 16px 4px;
    padding: 16px 18px;
    border: 1px solid var(--line);
    border-radius: 18px;
    background: var(--surface);
    overflow: hidden;
  }

  /* Тонкая золотая полоса сверху — неоклассический акцент. */
  .reminder::before {
    content: '';
    position: absolute;
    left: 18px;
    right: 18px;
    top: 0;
    height: 2px;
    background: var(--gilt);
  }

  .title {
    margin: 0 0 6px;
    font: 600 16px/1.3 var(--font-ui);
    color: var(--fg);
  }

  .text {
    margin: 0;
    font-size: 14px;
    line-height: 1.45;
    color: var(--fg-2);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
  }

  .primary {
    min-height: 40px;
    padding: 0 18px;
    border-radius: 20px;
    background: var(--accent);
    color: var(--on-accent);
    font: 600 15px/1 var(--font-ui);
  }

  .later {
    min-height: 40px;
    padding: 0 14px;
    font: 500 15px/1 var(--font-ui);
    color: var(--fg-2);
  }
</style>
