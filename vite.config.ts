import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// Сайт живёт по адресу https://egorpido.github.io/folio/, поэтому все пути начинаются с /folio/.
export default defineConfig({
  base: '/folio/',
  plugins: [
    svelte(),
    VitePWA({
      // Новая версия не перезагружает приложение посреди работы: она применяется,
      // когда приложение уходит в фон, или по кнопке «Обновить» (см. src/lib/pwa.svelte.ts).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        id: '/folio/',
        name: 'Folio',
        short_name: 'Folio',
        description: 'Личный планировщик',
        lang: 'ru',
        dir: 'ltr',
        start_url: '/folio/',
        scope: '/folio/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F3F4F7',
        theme_color: '#F3F4F7',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Всё приложение целиком сохраняется на телефоне и открывается без интернета.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
  define: {
    // Время сборки показываем в приложении, чтобы на телефоне было видно, что пришла новая версия.
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
