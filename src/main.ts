import '@fontsource/playfair-display/600.css';
import './styles/tokens.css';
import './styles/base.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { applyTheme } from './lib/theme.svelte';
import { startPwa } from './lib/pwa.svelte';

const target = document.getElementById('app');
if (!target) throw new Error('Не найден контейнер #app');

applyTheme();
mount(App, { target });
startPwa();
