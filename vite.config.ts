import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Сайт живёт по адресу https://egorpido.github.io/folio/, поэтому все пути начинаются с /folio/.
export default defineConfig({
  base: '/folio/',
  plugins: [svelte()],
  define: {
    // Время сборки показываем в приложении, чтобы на телефоне было видно, что пришла новая версия.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
