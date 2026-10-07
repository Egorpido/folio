<script lang="ts">
  import type { Tab } from './types';

  let { current, onselect }: { current: Tab; onselect: (tab: Tab) => void } = $props();

  const tabs: { id: Tab; label: string }[] = [
    { id: 'today', label: 'Сегодня' },
    { id: 'projects', label: 'Проекты' },
    { id: 'habits', label: 'Привычки' },
    { id: 'more', label: 'Ещё' },
  ];
</script>

<nav class="tabbar" aria-label="Разделы">
  {#each tabs as tab (tab.id)}
    <button
      type="button"
      class="tab"
      aria-current={current === tab.id ? 'page' : undefined}
      onclick={() => onselect(tab.id)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {#if tab.id === 'today'}
          <rect x="4" y="5" width="16" height="15" rx="3.2" />
          <path d="M4 10h16M9 3v4M15 3v4" />
          <circle class="solid" cx="12" cy="15" r="1.7" />
        {:else if tab.id === 'projects'}
          <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
        {:else if tab.id === 'habits'}
          <circle cx="12" cy="12" r="8" opacity="0.35" />
          <path d="M12 4a8 8 0 0 1 7.7 10.2" />
        {:else}
          <circle class="solid" cx="6" cy="12" r="1.7" />
          <circle class="solid" cx="12" cy="12" r="1.7" />
          <circle class="solid" cx="18" cy="12" r="1.7" />
        {/if}
      </svg>
      <span>{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    padding-inline: 8px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    -webkit-backdrop-filter: saturate(1.6) blur(20px);
    backdrop-filter: saturate(1.6) blur(20px);
    border-top: 1px solid var(--line);
  }

  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    height: var(--tabbar-h);
    color: var(--fg-3);
    font: 500 10.5px/1.2 var(--font-ui);
    transition: color 0.2s;
  }

  .tab[aria-current='page'] {
    color: var(--accent);
  }

  svg {
    width: 26px;
    height: 26px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .solid {
    fill: currentColor;
    stroke: none;
  }
</style>
