<script lang="ts">
  import { fly } from 'svelte/transition';
  import { toast, hideToast } from './toasts.svelte';

  let left = $state(5);

  // Отсчёт 5…1 для плашки с отменой.
  $effect(() => {
    if (!toast.current?.undo) return;
    left = 5;
    const timer = setInterval(() => (left = Math.max(1, left - 1)), 1000);
    return () => clearInterval(timer);
  });

  function undo() {
    const action = toast.current?.undo;
    hideToast();
    action?.();
  }
</script>

{#if toast.current}
  {#key toast.current.id}
    <div class="toast" role="status" in:fly={{ y: 12, duration: 220 }}>
      {#if toast.current.undo}
        <svg class="countdown" viewBox="0 0 24 24" aria-hidden="true">
          <circle class="track" cx="12" cy="12" r="10" />
          <circle class="progress" cx="12" cy="12" r="10" />
          <text x="12" y="15.5" text-anchor="middle">{left}</text>
        </svg>
      {/if}
      <span class="text">{toast.current.text}</span>
      {#if toast.current.undo}
        <!-- preventDefault на нажатии: если открыта клавиатура, она не прячется. -->
        <button type="button" onclick={undo} onpointerdown={(e) => e.preventDefault()}>Отменить</button>
      {/if}
    </div>
  {/key}
{/if}

<style>
  .toast {
    max-width: 536px;
    margin: 0 12px 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 50px;
    padding: 8px 8px 8px 14px;
    border-radius: 16px;
    background: var(--fg);
    color: var(--bg);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
  }

  @media (min-width: 560px) {
    .toast {
      margin-inline: auto;
    }
  }

  .countdown {
    flex: none;
    width: 24px;
    height: 24px;
    overflow: visible;
  }

  .track {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    opacity: 0.22;
  }

  /* Золотистое кольцо тает за 5 секунд — неоклассический акцент. */
  .progress {
    fill: none;
    stroke: var(--gilt-inv);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-dasharray: 62.83;
    stroke-dashoffset: 0;
    transform: rotate(-90deg);
    transform-origin: center;
    transform-box: fill-box;
    animation: countdown 5s linear forwards;
  }

  @keyframes countdown {
    to {
      stroke-dashoffset: 62.83;
    }
  }

  text {
    fill: currentColor;
    font: 600 10px var(--font-ui);
  }

  .text {
    flex: 1;
    min-width: 0;
    font: 500 15px/1.25 var(--font-ui);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  button {
    flex: none;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 10px;
    font: 600 15px/1 var(--font-ui);
    color: var(--accent-inv);
  }
</style>
