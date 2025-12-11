<script setup lang="ts">
import { computed, ref } from 'vue';

import '@hotosm/ui/dist/components/header/header.js';
import '@hotosm/ui/dist/style.css';

import FormBuilder from './pages/FormBuilder.vue';
import FormExamples from './pages/FormExamples.vue';
import FormUpload from './pages/FormUpload.vue';
import NotFound from './pages/NotFound.vue';
import '/src/styles/main.scss';

const routes: Record<string, any> = {
  '/': FormUpload,
  '/examples': FormExamples,
  '/builder': FormBuilder,
};

const headerTabs = [
  {
    label: 'Upload',
    clickEvent: async () => {
      window.location.hash = '/';
    },
  },
  {
    label: 'Examples',
    clickEvent: async () => {
      window.location.hash = '/examples';
    },
  },
  {
    label: 'Builder',
    clickEvent: async () => {
      window.location.hash = '/builder';
    },
  },
];

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
    size="small"
  ></hot-header>

  <div class="container">
    <component :is="currentView.is" v-bind="currentView.props" />
  </div>
</template>

<style scoped></style>
