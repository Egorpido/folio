<script lang="ts">
  import TabBar from './lib/TabBar.svelte';
  import Composer from './lib/Composer.svelte';
  import UpdateBanner from './lib/UpdateBanner.svelte';
  import StorageError from './lib/StorageError.svelte';
  import TodayScreen from './screens/TodayScreen.svelte';
  import ProjectsScreen from './screens/ProjectsScreen.svelte';
  import HabitsScreen from './screens/HabitsScreen.svelte';
  import MoreScreen from './screens/MoreScreen.svelte';
  import { pwa } from './lib/pwa.svelte';
  import { storage } from './lib/storage.svelte';
  import { ui } from './lib/ui.svelte';
  import { viewport } from './lib/viewport.svelte';
  import type { Tab } from './lib/types';

  let tab = $state<Tab>('today');
  let dockHeight = $state(0);
  let tabBarHeight = $state(0);

  // Клавиатура ложится поверх низа экрана. Поднимаем нижнюю панель так, чтобы поле ввода
  // встало прямо над клавиатурой, а вкладки остались под ней — как в обычных приложениях.
  const lift = $derived(Math.max(0, viewport.keyboard - tabBarHeight));

  $effect(() => {
    ui.dockCover = lift > 0 ? dockHeight - tabBarHeight : dockHeight;
  });

  function select(next: Tab) {
    // Повторное нажатие на открытую вкладку возвращает к началу экрана, как в iOS.
    if (next === tab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    tab = next;
    window.scrollTo(0, 0);
  }

  // Прокрутка списка при открытой клавиатуре прячет её, как в приложениях iPhone.
  function dismissKeyboard() {
    if (ui.composing && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }
</script>

{#if storage.error}
  <StorageError />
{:else}
  <main class="screen" style:--dock-h="{dockHeight}px" style:--lift="{lift}px" ontouchmove={dismissKeyboard}>
    {#if tab === 'today'}
      <TodayScreen />
    {:else if tab === 'projects'}
      <ProjectsScreen />
    {:else if tab === 'habits'}
      <HabitsScreen />
    {:else}
      <MoreScreen />
    {/if}
  </main>

  <div class="dock" style:--lift="{lift}px" bind:clientHeight={dockHeight}>
    {#if pwa.needRefresh}
      <UpdateBanner />
    {/if}
    {#if tab === 'today'}
      <Composer />
    {/if}
    <div bind:clientHeight={tabBarHeight}>
      <TabBar current={tab} onselect={select} />
    </div>
  </div>
{/if}

<style>
  .screen {
    max-width: 560px;
    min-height: 100svh;
    margin-inline: auto;
    padding-bottom: calc(var(--dock-h, 0px) + var(--lift, 0px) + 24px);
  }

  .dock {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    transform: translateY(calc(-1 * var(--lift, 0px)));
    transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: none;
  }

  .dock > :global(*) {
    pointer-events: auto;
  }
</style>
