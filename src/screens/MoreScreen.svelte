<script lang="ts">
  import ScreenHeader from '../lib/ScreenHeader.svelte';
  import { theme, setTheme, type ThemeChoice } from '../lib/theme.svelte';
  import { pwa } from '../lib/pwa.svelte';
  import { storage } from '../lib/storage.svelte';
  import { liveTaskCount } from '../lib/db/queries';
  import { buildLabel, isStandalone } from '../lib/env';
  import { formatBytes } from '../lib/format';

  const themes: { id: ThemeChoice; label: string }[] = [
    { id: 'system', label: 'Как в системе' },
    { id: 'light', label: 'Светлая' },
    { id: 'dark', label: 'Тёмная' },
  ];

  const taskCount = liveTaskCount();

  const storageLabel = $derived(storage.error ? 'ошибка' : storage.ready ? 'работает' : 'проверяем…');
  const protectionLabel = $derived(
    storage.persisted === null ? 'проверяем…' : storage.persisted ? 'включена' : 'не включена',
  );
</script>

<ScreenHeader title="Ещё" />

<section class="group" aria-labelledby="g-theme">
  <h2 class="group-label" id="g-theme">Тема</h2>
  <div class="seg" role="radiogroup" aria-labelledby="g-theme">
    {#each themes as t (t.id)}
      <button type="button" role="radio" aria-checked={theme.choice === t.id} onclick={() => setTheme(t.id)}>
        {t.label}
      </button>
    {/each}
  </div>
</section>

<section class="group" aria-labelledby="g-data">
  <h2 class="group-label" id="g-data">Данные</h2>
  <dl class="rows">
    <div class="row">
      <dt>Хранилище</dt>
      <dd class:warn={!!storage.error}>{storageLabel}</dd>
    </div>
    <div class="row">
      <dt>Защита от очистки</dt>
      <dd class:warn={storage.persisted === false}>{protectionLabel}</dd>
    </div>
    <div class="row">
      <dt>Дел сохранено</dt>
      <dd>{$taskCount ?? '…'}</dd>
    </div>
    <div class="row">
      <dt>Занято места</dt>
      <dd>{storage.usage === null ? '—' : formatBytes(storage.usage)}</dd>
    </div>
  </dl>
  <p class="group-note">
    Все дела хранятся только на этом iPhone.
    {#if storage.persisted}
      Защита включена: iPhone не будет сам стирать их при нехватке места.
    {:else if storage.persisted === false}
      iPhone может стереть их при нехватке места, поэтому резервные копии особенно важны.
    {/if}
    Если удалить Folio с экрана «Домой», дела удалятся вместе с ним. Резервные копии в файл появятся на шаге 7.
  </p>
</section>

<section class="group" aria-labelledby="g-about">
  <h2 class="group-label" id="g-about">О приложении</h2>
  <dl class="rows">
    <div class="row">
      <dt>Версия</dt>
      <dd>от {buildLabel}</dd>
    </div>
    <div class="row">
      <dt>Открыто</dt>
      <dd class:warn={!isStandalone}>{isStandalone ? 'как приложение' : 'в браузере'}</dd>
    </div>
    <div class="row">
      <dt>Без интернета</dt>
      <dd>{pwa.offlineReady ? 'работает' : 'включится после перезапуска'}</dd>
    </div>
  </dl>
</section>

<style>
  .seg {
    margin: 4px 16px 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 2px;
    padding: 3px;
    border-radius: 12px;
    background: var(--sunk);
  }

  .seg button {
    min-height: 40px;
    padding: 0 6px;
    border-radius: 9px;
    font: 500 14px/1.2 var(--font-ui);
    color: var(--fg-2);
    transition: background-color 0.2s, color 0.2s;
  }

  .seg button[aria-checked='true'] {
    background: var(--surface);
    color: var(--fg);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14);
  }

  .rows {
    margin: 4px 16px 0;
    padding: 0 16px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--surface);
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding: 14px 0;
    border-bottom: 1px solid var(--line);
    font-size: 16px;
  }

  .row:last-child {
    border-bottom: 0;
  }

  dt {
    color: var(--fg);
  }

  dd {
    margin: 0;
    color: var(--fg-2);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  dd.warn {
    color: var(--overdue);
  }
</style>
