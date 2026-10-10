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
  let scroller = $state<HTMLElement>();

  // Пока пишешь дело, вкладки не нужны: поле ввода стоит вплотную над клавиатурой.
  const hideTabs = $derived(ui.composing && viewport.keyboardOpen);

  function select(next: Tab) {
    // Повторное нажатие на открытую вкладку возвращает к началу экрана, как в iOS.
    if (next === tab) {
      scroller?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    tab = next;
    if (scroller) scroller.scrollTop = 0;
  }

  // Касание или прокрутка списка при открытой клавиатуре прячет её, как в приложениях iPhone.
  function dismissKeyboard(event: PointerEvent) {
    if (!ui.composing) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, button')) return;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  $effect(() => {
    const el = scroller;
    if (!el) return;
    el.addEventListener('pointerdown', dismissKeyboard);
    return () => el.removeEventListener('pointerdown', dismissKeyboard);
  });

  // Когда список становится ниже (открылась клавиатура) или выше, его нижний край остаётся
  // на месте, как в мессенджерах: дела рядом с полем ввода не уезжают за него.
  $effect(() => {
    const el = scroller;
    if (!el) return;
    let previous = el.clientHeight;
    const observer = new ResizeObserver(() => {
      const delta = previous - el.clientHeight;
      previous = el.clientHeight;
      if (delta) el.scrollTop += delta;
    });
    observer.observe(el);
    return () => observer.disconnect();
  });
</script>

<!-- Оболочка повторяет видимую часть экрана: список сверху прокручивается сам по себе,
     нижняя панель всегда видна и с клавиатурой встаёт прямо над ней. -->
<div class="shell">
  {#if storage.error}
    <div class="scroller">
      <StorageError />
    </div>
  {:else}
    <div class="scroller" bind:this={scroller}>
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
    </div>

    <div class="dock">
      {#if pwa.needRefresh}
        <UpdateBanner />
      {/if}
      {#if tab === 'today'}
        <Composer />
      {/if}
      {#if !hideTabs}
        <TabBar current={tab} onselect={select} />
      {/if}
    </div>
  {/if}
</div>

<style>
  .shell {
    position: fixed;
    left: 0;
    right: 0;
    top: var(--vvtop, 0px);
    height: var(--vvh, 100%);
    display: flex;
    flex-direction: column;
  }

  .scroller {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior-y: contain;
  }

  .screen {
    max-width: 560px;
    margin-inline: auto;
    padding-bottom: 24px;
  }

  .dock {
    flex: none;
  }
</style>
