<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import { useFormStore } from '@/stores/form';

import BuilderToolbar from './BuilderToolbar.vue';
import QuestionPalette from './QuestionPalette.vue';
import SurveyNodeList from './SurveyNodeList.vue';

const store = useFormStore();

const announcement = ref('');

function onAnnounce(message: string): void {
  announcement.value = message;
}

const EDITABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'WA-INPUT', 'WA-TEXTAREA', 'WA-SELECT']);

function onGlobalKeydown(e: KeyboardEvent): void {
  const modifier = e.metaKey || e.ctrlKey;
  if (!modifier) return;

  const inEditable = e
    .composedPath()
    .some((el) => el instanceof HTMLElement && (EDITABLE.has(el.tagName) || el.isContentEditable));
  if (inEditable) return;

  if (e.key.toLowerCase() === 'z' && e.shiftKey) {
    e.preventDefault();
    store.redo();
    return;
  }
  if (e.key.toLowerCase() === 'z') {
    e.preventDefault();
    store.undo();
    return;
  }
  if (e.key.toLowerCase() === 'y') {
    e.preventDefault();
    store.redo();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
});
</script>

<template>
  <div class="builder-canvas">
    <BuilderToolbar />
    <div class="builder-canvas-body" @click.self="store.selectNode(null)">
      <QuestionPalette />
      <div class="builder-canvas-tree">
        <SurveyNodeList :parent-id="null" :nodes="store.document.survey" @announce="onAnnounce" />
      </div>
    </div>
    <div class="sr-only" aria-live="polite">{{ announcement }}</div>
  </div>
</template>

<style scoped lang="scss">
.builder-canvas {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.builder-canvas-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;

  @include bp(md) {
    flex-direction: row;
  }
}

.builder-canvas-tree {
  flex: 1;
  min-width: 0;
  padding: $spacing-md;
  overflow-y: auto;
}
</style>
