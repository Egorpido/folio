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
  let dockHeight = $state(0);
  let tabBarHeight = $state(0);

  // Сразу после нажатия на поле берём высоту клавиатуры из прошлого раза: поле начинает
  // подниматься одновременно с ней. Если клавиатура так и не появилась (например, подключена
  // внешняя), через мгновение перестаём ждать.
  let predicting = $state(false);
  $effect(() => {
    if (!ui.composing) {
      predicting = false;
      return;
    }
    predicting = true;
    const timer = setTimeout(() => (predicting = false), 700);
    return () => clearTimeout(timer);
  });

  const keyboard = $derived(
    !ui.composing ? 0 : viewport.keyboardOpen ? viewport.keyboard : predicting ? viewport.lastKeyboard : 0,
  );
  // Поле ввода встаёт вплотную к клавиатуре, а вкладки уходят под неё.
  const lift = $derived(Math.max(0, keyboard - tabBarHeight));

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
</script>

<!-- Оболочка на всю высоту экрана. Список прокручивается под нижней панелью; панель
     с полем ввода поднимается над клавиатурой сдвигом — его рисует видеочип, без рывков. -->
<div class="shell">
  {#if storage.error}
    <div class="scroller">
      <StorageError />
    </div>
  {:else}
    <div class="scroller" bind:this={scroller}>
      <main class="screen" style:--content-bottom="{dockHeight + lift}px">
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

    <div class="dock" style:--lift="{lift}px" bind:clientHeight={dockHeight}>
      {#if pwa.needRefresh}
        <UpdateBanner />
      {/if}
      {#if tab === 'today'}
        <Composer />
      {/if}
      <div class="tabs" class:hidden={ui.composing} inert={ui.composing} bind:clientHeight={tabBarHeight}>
        <TabBar current={tab} onselect={select} />
      </div>
    </div>
  {/if}
</div>

<style>
  .shell {
    position: fixed;
    left: 0;
    right: 0;
    top: var(--vvtop, 0px);
    height: var(--fullh, 100%);
  }

  .scroller {
    position: absolute;
    inset: 0;
    overflow-y: auto;
    overscroll-behavior-y: contain;
  }

  /* Снизу у содержимого запас под нижнюю панель и клавиатуру: последние дела можно
     прокрутить так, чтобы они встали над полем ввода. */
  .screen {
    max-width: 560px;
    margin-inline: auto;
    padding-bottom: calc(var(--content-bottom, 0px) + 24px);
  }

  .dock {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    transform: translateY(calc(-1 * var(--lift, 0px)));
    transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    will-change: transform;
  }

  .tabs {
    transition: opacity 0.2s ease;
  }

  .tabs.hidden {
    opacity: 0;
  }
</style>
