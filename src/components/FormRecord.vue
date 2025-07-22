<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string,
  description: string,
  tags: string[],
  url: string
}>()

const xlsformViewerUrl = computed(() => {
  if (!props.url) return ''
  return `https://xlsforms.fmtm.dev?url=${props.url}`
})
</script>

<template>
  <div class="record">
    <h3>{{ title }}</h3>
    <p><i>{{ location }}</i></p>
    <p>{{ description }}</p>
    <p>
      <strong>Tags:</strong> {{ tags.join(', ') }}
    </p>
    <a :href="xlsformViewerUrl">Open form</a>
    <br>
    <a :href="url">Download form</a>
  </div>
</template>

<style scoped>
.record {
  border: 1px solid #ccc;
  padding: 1rem;
  margin: 0.5rem 0;
}
</style>
