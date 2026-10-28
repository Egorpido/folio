<script lang="ts">
  import { ai, extractTasks, isAiReady, MODELS, PROVIDERS, saveSettings } from './ai.svelte';
  import { clock } from '../clock.svelte';

  let showKey = $state(false);
  let checking = $state(false);
  let checkResult = $state('');
  let checkOk = $state(false);

  const customModel = $derived(!MODELS.some((m) => m.id === ai.settings.model));

  function chooseProvider(id: string) {
    const provider = PROVIDERS.find((p) => p.id === id);
    saveSettings({ provider: id, baseUrl: provider?.baseUrl || (id === 'custom' ? ai.settings.baseUrl : '') });
  }

  async function check() {
    checking = true;
    checkResult = '';
    try {
      const tasks = await extractTasks('завтра в 10 позвонить в банк', clock.today);
      checkOk = tasks.length > 0;
      checkResult = checkOk ? `Работает: «${tasks[0]!.title}»` : 'Сервис ответил, но дел не нашёл. Попробуйте другую модель.';
    } catch (error) {
      checkOk = false;
      checkResult = error instanceof Error ? error.message : 'Не получилось.';
    } finally {
      checking = false;
    }
  }
</script>

<section class="group" aria-labelledby="g-ai">
  <h2 class="group-label" id="g-ai">ИИ-ввод</h2>
  <div class="card">
    <label class="field">
      <span>Сервис</span>
      <select value={ai.settings.provider} onchange={(e) => chooseProvider(e.currentTarget.value)}>
        {#each PROVIDERS as p (p.id)}
          <option value={p.id}>{p.name}</option>
        {/each}
      </select>
    </label>

    {#if ai.settings.provider === 'custom'}
      <label class="field">
        <span>Адрес API</span>
        <input
          type="url"
          placeholder="https://…/v1"
          value={ai.settings.baseUrl}
          autocapitalize="off"
          autocomplete="off"
          oninput={(e) => saveSettings({ baseUrl: e.currentTarget.value.trim() })}
        />
      </label>
    {/if}

    <label class="field">
      <span>Ключ</span>
      <div class="key">
        <input
          type={showKey ? 'text' : 'password'}
          placeholder="Вставьте ключ"
          value={ai.settings.key}
          autocapitalize="off"
          autocomplete="off"
          spellcheck="false"
          oninput={(e) => saveSettings({ key: e.currentTarget.value.trim() })}
        />
        <button type="button" class="eye" onclick={() => (showKey = !showKey)}>{showKey ? 'Скрыть' : 'Показать'}</button>
      </div>
    </label>

    <label class="field">
      <span>Модель</span>
      <select
        value={customModel ? 'custom' : ai.settings.model}
        onchange={(e) => {
          if (e.currentTarget.value !== 'custom') saveSettings({ model: e.currentTarget.value });
          else saveSettings({ model: '' });
        }}
      >
        {#each MODELS as m (m.id)}
          <option value={m.id}>{m.name}</option>
        {/each}
        <option value="custom">Другая (ввести название)</option>
      </select>
      {#if !customModel}
        <small>{MODELS.find((m) => m.id === ai.settings.model)?.note}</small>
      {/if}
    </label>

    {#if customModel}
      <label class="field">
        <span>Название модели</span>
        <input
          type="text"
          placeholder="например, qwen/qwen3.5-flash-02-23"
          value={ai.settings.model}
          autocapitalize="off"
          autocomplete="off"
          oninput={(e) => saveSettings({ model: e.currentTarget.value.trim() })}
        />
      </label>
    {/if}

    <label class="field">
      <span>Когда разбирать ИИ</span>
      <select value={String(ai.settings.aiMinChars)} onchange={(e) => saveSettings({ aiMinChars: Number(e.currentTarget.value) })}>
        <option value="20">Текст от 20 знаков</option>
        <option value="30">Текст от 30 знаков</option>
        <option value="50">Текст от 50 знаков</option>
        <option value="0">Никогда</option>
      </select>
      <small>Длинный текст по «вводу» или кнопке ↑ уходит ИИ, короткий добавляется как есть. Чтобы добавить длинный текст без ИИ, нажмите на подсказку «Разберёт ИИ» над полем — она сменится на «Без ИИ».</small>
    </label>

    <button type="button" class="check" disabled={!isAiReady() || checking} onclick={check}>
      {checking ? 'Проверяю…' : 'Проверить подключение'}
    </button>
    {#if checkResult}
      <p class="result" class:ok={checkOk}>{checkResult}</p>
    {/if}
  </div>
  <p class="group-note">
    Длинный текст ИИ разложит на отдельные дела, а вы проверите их перед добавлением. Текст уходит в выбранный сервис и к самой модели; дела по-прежнему хранятся только на телефоне.
    Ключ хранится только на этом iPhone и в резервную копию не попадает.
  </p>
</section>

<style>
  .card {
    margin: 4px 16px 0;
    padding: 6px 16px 16px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--surface);
    display: grid;
    gap: 4px;
  }

  .field {
    display: grid;
    gap: 6px;
    padding: 8px 0;
  }

  small {
    font-size: 13px;
    line-height: 1.35;
    color: var(--fg-2);
  }

  .field > span {
    font-size: 13px;
    color: var(--fg-2);
  }

  select,
  input {
    width: 100%;
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--bg);
    color: var(--fg);
    font: 400 16px/1.2 var(--font-ui);
    outline: none;
  }

  select:focus,
  input:focus {
    border-color: var(--accent);
  }

  .key {
    display: flex;
    gap: 8px;
  }

  .eye {
    flex: none;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid var(--line);
    font: 500 14px/1 var(--font-ui);
    color: var(--accent);
  }

  .check {
    margin-top: 8px;
    min-height: 46px;
    border-radius: 23px;
    border: 1px solid var(--line);
    color: var(--accent);
    font: 600 16px/1 var(--font-ui);
  }

  .check:disabled {
    opacity: 0.45;
  }

  .result {
    margin: 6px 2px 0;
    font-size: 14px;
    line-height: 1.4;
    color: var(--overdue);
  }

  .result.ok {
    color: var(--p3);
  }
</style>
