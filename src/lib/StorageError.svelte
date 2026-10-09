<script lang="ts">
  import { storage } from './storage.svelte';
</script>

<div class="error" role="alert">
  <h1>Не получается открыть хранилище</h1>
  <p>
    Folio не смог открыть базу с делами на этом iPhone. Закройте приложение полностью (смахните вверх) и откройте
    снова. Если не поможет, пришлите текст ниже.
  </p>
  <pre>{storage.error}</pre>
</div>

<style>
  .error {
    max-width: 560px;
    margin-inline: auto;
    padding: calc(env(safe-area-inset-top, 0px) + 40px) 24px 40px;
  }

  h1 {
    margin: 0 0 12px;
    font-family: var(--font-head);
    font-weight: var(--head-weight);
    font-size: 28px;
    line-height: 1.15;
    color: var(--overdue);
  }

  p {
    margin: 0 0 16px;
    font-size: 16px;
    line-height: 1.5;
    color: var(--fg);
  }

  pre {
    margin: 0;
    padding: 12px;
    border-radius: 12px;
    background: var(--sunk);
    color: var(--fg-2);
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
