import { defineConfig } from '@vite-pwa/assets-generator/config';

// Генерация иконок из public/icon.svg: npx pwa-assets-generator
// Иконка уже закрашена до краёв, поэтому без отступов: iPhone сам скругляет углы.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']], padding: 0 },
    maskable: { sizes: [512], padding: 0, resizeOptions: { background: '#1D2A73' } },
    apple: { sizes: [180], padding: 0, resizeOptions: { background: '#1D2A73' } },
  },
  images: ['public/icon.svg'],
});
