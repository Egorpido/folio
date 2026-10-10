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
  let tabBarHeight = $state(0);

  // С открытой клавиатурой вкладки не нужны: они плавно гаснут и уходят под клавиатуру —
  // оболочка продлевается вниз ровно на их высоту, поэтому поле ввода встаёт вплотную
  // над клавиатурой и ничего не прыгает.
  const hideTabs = $derived(viewport.keyboardOpen);
  const shellExtra = $derived(hideTabs ? tabBarHeight : 0);

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
<div class="shell" style:--shell-extra="{shellExtra}px">
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
      <div class="tabs" class:hidden={hideTabs} inert={hideTabs} bind:clientHeight={tabBarHeight}>
        <TabBar current={tab} onselect={select} />
      </div>
    </div>
  {/if}
</div>

<style>
  /* Высота меняется плавно — поле ввода поднимается вместе с клавиатурой.
     Верх не анимируется: он должен точно повторять видимую область. */
  .shell {
    position: fixed;
    left: 0;
    right: 0;
    top: var(--vvtop, 0px);
    height: calc(var(--vvh, 100%) + var(--shell-extra, 0px));
    display: flex;
    flex-direction: column;
    transition: height 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
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

  .tabs {
    transition: opacity 0.2s ease;
  }

  .tabs.hidden {
    opacity: 0;
  }
</style>
