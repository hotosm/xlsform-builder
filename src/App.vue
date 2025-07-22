<script setup lang="ts">
import { ref, computed } from 'vue'

import '@hotosm/ui/dist/style.css';
import '@hotosm/ui/dist/components/header/header.js';

import FormBuilder from './pages/FormBuilder.vue'
import FormExamples from './pages/FormExamples.vue'
import FormUpload from './pages/FormUpload.vue'
import NotFound from './pages/NotFound.vue'

import FormRecord from './components/FormRecord.vue'

const routes = {
  '/': FormExamples,
  '/builder': FormBuilder,
  '/upload': FormUpload,
}

const headerTabs = [
  {
    label: 'Examples',
    clickEvent: async () => {
      window.location = "#/"
    }
  },
  {
    label: 'Builder',
    clickEvent: async () => {
      window.location = "#/builder"
    }
  },
  {
    label: 'Upload',
    clickEvent: async () => {
      window.location = "#/upload"
    }
  },
]

// Handle routes
const currentPath = ref(window.location.hash)

window.addEventListener('hashchange', () => {
  currentPath.value = window.location.hash
})

const currentView = computed(() => {
  return {
    is: routes[currentPath.value.slice(1) || '/'] || NotFound,
    props: {
      // instead we fetch this directly on the FormExamples page
      // forms: forms.value
    }
  }
})
</script>

<template>
  <hot-header
    title="XLSForm Builder"
    logo="/favicon.svg"
    :tabs="headerTabs"
  >
  </hot-header>

  <component :is="currentView.is" v-bind="currentView.props" />
</template>

<style scoped>
</style>
