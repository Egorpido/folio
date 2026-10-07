<script lang="ts">
  import ScreenHeader from '../lib/ScreenHeader.svelte';
  import InstallHint from '../lib/InstallHint.svelte';
  import { formatToday } from '../lib/env';

  const today = formatToday();
</script>

<ScreenHeader title="Сегодня" subtitle={today} />
<InstallHint />

<section class="group" aria-labelledby="g-today">
  <h2 class="group-label" id="g-today">На сегодня</h2>
  <p class="group-empty">Дел на сегодня нет.</p>
</section>

<section class="group" aria-labelledby="g-inbox">
  <h2 class="group-label" id="g-inbox">Входящие</h2>
  <p class="group-empty">Пусто. Сюда попадают новые дела без даты.</p>
</section>
