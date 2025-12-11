<script setup lang="ts">
import { onMounted, ref } from 'vue';

import '@webawesome/button/button.js';

import FormRecord from '../components/FormRecord.vue';

// Handle forms
interface FormData {
  title: string;
  location: string;
  description: string;
  tags: string[];
  url: string;
  external_link: string;
}
const forms = ref<FormData[]>([]);
const formsUrl =
  import.meta.env.VITE_METADATA_URL || 'https://xlsforms.s3.amazonaws.com/metadata.json';

onMounted(async () => {
  try {
    const cacheBustUrl = `${formsUrl}?t=${Date.now()}`;
    const res = await fetch(cacheBustUrl, { cache: 'no-store' });
    const json = await res.json();
    forms.value = json.forms;
  } catch (e) {
    console.error('Failed to fetch forms:', e);
  }
});

function goToUpload() {
  window.location.hash = '/';
}
</script>

<template>
  <div>
    <div v-if="forms.length === 0" class="empty-state">
      <div class="empty-state-content">
        <h3>No Forms Yet</h3>
        <p>Upload your first XLSForm to get started</p>
        <wa-button variant="danger" @click="goToUpload">Upload Form</wa-button>
      </div>
    </div>

    <div v-else class="forms-container">
      <h2>Example Forms</h2>

      <FormRecord
        v-for="(form, index) in forms"
        :key="index"
        :title="form.title"
        :location="form.location"
        :description="form.description"
        :tags="form.tags"
        :url="form.url"
        :external_link="form.external_link"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: $spacing-xl;

  .empty-state-content {
    text-align: center;
    max-width: 25rem;
  }
}

.forms-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: $spacing-md;
  align-items: stretch;

  @include bp(lg) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: $spacing-lg;
  }

  @include bp(xl) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
