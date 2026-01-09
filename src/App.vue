<script setup lang="ts">
import { computed, ref } from 'vue';

import '@hotosm/ui/dist/components/header/header.js';
import '@hotosm/ui/dist/style.css';

import FormBuilder from './pages/FormBuilder.vue';
import FormExamples from './pages/FormExamples.vue';
import FormUpload from './pages/FormUpload.vue';
import NotFound from './pages/NotFound.vue';
import { isMobileDevice } from './utils/deviceDetection';
import '/src/styles/main.scss';

const routes: Record<string, any> = {
  '/': FormExamples,
  '/upload': FormUpload,
  '/builder': FormBuilder,
};

const navItems = [
  { label: 'Examples', path: '/' },
  { label: 'Upload', path: '/upload' },
  { label: 'Builder', path: '/builder' },
];

const headerTabs = navItems.map((item) => ({
  label: item.label,
  clickEvent: async () => {
    window.location.hash = item.path;
  },
}));

const drawerLinks = navItems.map((item) => ({
  label: item.label,
  href: `#${item.path}`,
}));

const isMobile = isMobileDevice();

// Handle routes
const currentPath = ref(window.location.hash);

window.addEventListener('hashchange', () => {
  currentPath.value = window.location.hash;
});

const currentView = computed(() => {
  return {
    is: routes[currentPath.value.slice(1) || '/'] || NotFound,
    props: {
      // instead we fetch this directly on the FormExamples page
      // forms: forms.value
    },
  };
});
</script>

<template>
  <hot-header
    id="hdr"
    title="XLSForm Builder"
    logo="/favicon.svg"
    :tabs="headerTabs"
    :drawerLinks="drawerLinks"
    :drawer="isMobile"
    size="small"
  ></hot-header>

  <div class="container">
    <component :is="currentView.is" v-bind="currentView.props" />
  </div>
</template>

<style scoped></style>
