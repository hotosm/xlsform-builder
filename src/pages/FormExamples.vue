<script setup lang="ts">
import { onMounted, ref } from 'vue';

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
const formsUrl = 'https://xlsforms.s3.amazonaws.com/metadata.json';

onMounted(async () => {
  try {
    const res = await fetch(formsUrl);
    const json = await res.json();
    forms.value = json.forms;
  } catch (e) {
    console.error('Failed to fetch forms:', e);
  }
});
</script>

<template>
  <div>
    <h2>Example Forms</h2>
    <div class="forms-container">
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
