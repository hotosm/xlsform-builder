<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string,
  location: string,
  description: string,
  tags: string[],
  url: string,
  external_link: string,
}>()

const xlsformViewerUrl = computed(() => {
  if (!props.url) return ''
  return `https://xlsform-editor.fmtm.hotosm.org?url=${props.url}`
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
    <br>
    <a v-if="external_link != ''" :href="external_link">External reference</a>
  </div>
</template>

<style scoped>
.record {
  border: 1px solid #ccc;
  padding: 1rem;
  margin: 0.5rem 0;
}
</style>
