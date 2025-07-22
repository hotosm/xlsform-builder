<script setup lang="ts">
import { ref, onMounted } from 'vue'

import FormRecord from '../components/FormRecord.vue'

// Handle forms
const forms = ref([])
const formsUrl = 'https://xlsforms.s3.amazonaws.com/metadata.json'

onMounted(async () => {
  try {
    const res = await fetch(formsUrl)
    const json = await res.json()
    forms.value = json.forms
  } catch (e) {
    console.error('Failed to fetch forms:', e)
  }
})
</script>

<template>
  <div>
    <h2>Example Forms</h2>
    <FormRecord
      v-for="(form, index) in forms"
      :key="index"
      :title="form.title"
      :location="form.location"
      :description="form.description"
      :tags="form.tags"
      :url="form.url"
    />
  </div>
</template>
