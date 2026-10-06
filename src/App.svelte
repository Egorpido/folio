<script lang="ts">
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  const todayLabel = capitalize(
    new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
  );

  const buildLabel = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(__BUILD_TIME__));
</script>

<main class="splash">
  <p class="eyebrow">Личный планировщик</p>
  <h1>Folio</h1>
  <i class="rule" aria-hidden="true"></i>
  <p class="date">{todayLabel}</p>
  <p class="status">Сайт открывается по защищённому адресу. Скоро здесь появятся ваши дела.</p>
  <p class="build">Версия от {buildLabel}</p>
</main>

<style>
  .splash {
    min-height: 100svh;
    max-width: 520px;
    margin-inline: auto;
    padding-inline: 28px;
    padding-block: calc(env(safe-area-inset-top, 0px) + 40px) calc(env(safe-area-inset-bottom, 0px) + 40px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
  }

  .eyebrow {
    margin: 0;
    font: 600 12px/1 var(--font-ui);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--fg-3);
  }

  h1 {
    margin: 0;
    font-family: var(--font-head);
    font-weight: var(--head-weight);
    letter-spacing: var(--head-track);
    font-size: 68px;
    line-height: 1;
    color: var(--accent);
  }

  .rule {
    display: block;
    width: 40px;
    height: 1px;
    margin-block: 6px 4px;
    background: var(--gilt);
  }

  .date {
    margin: 0;
    font-size: 17px;
    color: var(--fg);
  }

  .status {
    margin: 0;
    max-width: 30ch;
    font-size: 15px;
    line-height: 1.5;
    color: var(--fg-2);
  }

  .build {
    margin: 18px 0 0;
    font-size: 13px;
    color: var(--fg-3);
    font-variant-numeric: tabular-nums;
  }
</style>
