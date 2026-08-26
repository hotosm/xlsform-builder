// register all wa-* elements before first render (avoids FOUCE)
import '@hotosm/ui/dist/webawesome-all.js';

import { createApp } from 'vue';

import App from './App.vue';

createApp(App).mount('#app');
