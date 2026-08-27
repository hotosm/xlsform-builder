<script setup lang="ts">
import { computed, ref, type Component } from 'vue';

import FormBuilder from './pages/FormBuilder.vue';
import FormExamples from './pages/FormExamples.vue';
import FormUpload from './pages/FormUpload.vue';
import NotFound from './pages/NotFound.vue';
import { isMobileDevice } from './utils/deviceDetection';
import '/src/styles/main.scss';

const routes: Record<string, Component> = {
  '/': FormExamples,
  '/upload': FormUpload,
  '/builder': FormBuilder,
};

const navItems = [
  { label: 'Home', path: '/' },
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
const hashPath = () => window.location.hash.slice(1) || '/';
const currentPath = ref(hashPath());

window.addEventListener('hashchange', () => {
  currentPath.value = hashPath();
});

// Keep the header's underline on the current page
const activeTabIndex = computed(() =>
  navItems.findIndex((item) => item.path === currentPath.value),
);

const currentView = computed(() => {
  return {
    is: routes[currentPath.value] || NotFound,
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
    :selectedTab="activeTabIndex"
    :activeTabIndex="activeTabIndex"
    size="s"
  >
    <!-- HOT tool switcher, top right of the header -->
    <hotosm-tool-menu slot="auth"></hotosm-tool-menu>
  </hot-header>

  <div class="container">
    <component :is="currentView.is" v-bind="currentView.props" />
  </div>
</template>

<style scoped></style>
