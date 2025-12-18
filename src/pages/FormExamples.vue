<script setup lang="ts">
import { onMounted, ref } from 'vue';

import '@webawesome/button/button.js';

import FormRecord from '../components/FormRecord.vue';

const forms = ref<FormMetadata[]>([]);
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

    <div v-else class="examples-content">
      <h2>Example Forms</h2>

      <div class="forms-container">
        <FormRecord
          v-for="form in forms"
          :key="form.id"
          :id="form.id"
          :title="form.title"
          :location="form.location"
          :description="form.description"
          :tags="form.tags"
          :url="form.url"
          :external_link="form.external_link"
        />
      </div>
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

.examples-content {
  @include bp(lg) {
    max-width: 70rem;
    margin: 0 auto;
  }
}

.forms-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: $spacing-md;
  align-items: stretch;
  justify-content: center;

  @include bp(lg) {
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: $spacing-lg;
  }
}
</style>
