<script lang="ts">
  let { title, subtitle }: { title: string; subtitle?: string } = $props();
</script>

<header class="head">
  <h1>{title}</h1>
  {#if subtitle}
    <p class="sub">{subtitle}</p>
  {/if}
  <i class="rule" aria-hidden="true"></i>
</header>

<style>
  .head {
    padding: calc(env(safe-area-inset-top, 0px) + 22px) 20px 4px;
  }

  h1 {
    margin: 0;
    font-family: var(--font-head);
    font-weight: var(--head-weight);
    letter-spacing: var(--head-track);
    font-size: 36px;
    line-height: 1.05;
    color: var(--fg);
    text-wrap: balance;
  }

  .sub {
    margin: 6px 0 0;
    font-size: 15px;
    color: var(--fg-2);
  }

  .rule {
    display: block;
    width: 28px;
    height: 1px;
    margin-top: 14px;
    background: var(--gilt);
  }
</style>
