<script lang="ts">
  import TabBar from './lib/TabBar.svelte';
  import UpdateBanner from './lib/UpdateBanner.svelte';
  import StorageError from './lib/StorageError.svelte';
  import { storage } from './lib/storage.svelte';
  import TodayScreen from './screens/TodayScreen.svelte';
  import ProjectsScreen from './screens/ProjectsScreen.svelte';
  import HabitsScreen from './screens/HabitsScreen.svelte';
  import MoreScreen from './screens/MoreScreen.svelte';
  import { pwa } from './lib/pwa.svelte';
  import type { Tab } from './lib/types';

  let tab = $state<Tab>('today');

  function select(next: Tab) {
    // Повторное нажатие на открытую вкладку возвращает к началу экрана, как в iOS.
    if (next === tab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    tab = next;
    window.scrollTo(0, 0);
  }
</script>

{#if storage.error}
  <StorageError />
{:else}
  <main class="screen">
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

  {#if pwa.needRefresh}
    <UpdateBanner />
  {/if}

  <TabBar current={tab} onselect={select} />
{/if}

<style>
  .screen {
    max-width: 560px;
    min-height: 100svh;
    margin-inline: auto;
    padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + 32px);
  }
</style>
