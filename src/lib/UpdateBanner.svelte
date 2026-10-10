<script lang="ts">
  import { fly } from 'svelte/transition';
  import { applyUpdate } from './pwa.svelte';
</script>

<div class="banner" role="status" transition:fly={{ y: 16, duration: 220 }}>
  <span>Есть новая версия Folio</span>
  <button type="button" onclick={applyUpdate}>Обновить</button>
</div>

<style>
  .banner {
    max-width: 536px;
    margin: 0 12px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 52px;
    padding: 8px 8px 8px 16px;
    border-radius: 16px;
    background: var(--fg);
    color: var(--bg);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
    font: 500 15px/1.3 var(--font-ui);
  }

  button {
    min-height: 36px;
    padding: 0 14px;
    border-radius: 10px;
    font-weight: 600;
    color: var(--accent-inv);
  }
</style>
