import '@hotosm/ui/dist/style.css';
// register all wa-* elements before first render (avoids FOUCE)
import '@hotosm/ui/dist/webawesome-all.js';
// hot-* components used across the app
import '@hotosm/ui/dist/components/file-input-dropzone/file-input-dropzone.js';
import '@hotosm/ui/dist/components/header/header.js';
import '@hotosm/ui/dist/components/tool-menu/tool-menu.js';

import { createApp } from 'vue';

import App from './App.vue';

createApp(App).mount('#app');
