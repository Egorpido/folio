<script lang="ts">
  import { isStandalone } from './env';
</script>

{#if !isStandalone}
  <aside class="hint" aria-label="Как установить Folio">
    <p class="title">Установите Folio на экран «Домой»</p>
    <ol>
      <li>Нажмите «Поделиться» в Safari. В iOS 26 эта кнопка может прятаться в меню «•••».</li>
      <li>Выберите «На экран „Домой“».</li>
      <li>Проверьте, что включено «Открыть как веб-приложение», и нажмите «Добавить».</li>
    </ol>
    <p class="note">
      В Safari дела хранятся отдельно от установленного приложения, и iPhone может стереть их, если сайт долго не
      открывать. Пользуйтесь Folio с экрана «Домой».
    </p>
  </aside>
{/if}

<style>
  .hint {
    margin: 14px 16px 4px;
    padding: 16px 18px;
    border: 1px solid var(--line);
    border-radius: 18px;
    background: var(--surface);
  }

  .title {
    margin: 0 0 8px;
    font: 600 16px/1.3 var(--font-ui);
    color: var(--fg);
  }

  ol {
    margin: 0;
    padding-left: 20px;
    display: grid;
    gap: 6px;
    font-size: 15px;
    line-height: 1.4;
    color: var(--fg);
  }

  li::marker {
    color: var(--fg-2);
  }

  .note {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.4;
    color: var(--fg-2);
  }
</style>
