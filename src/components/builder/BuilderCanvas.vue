<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import { useFormStore } from '@/stores/form';

import BuilderToolbar from './BuilderToolbar.vue';
import NodeInspector from './NodeInspector.vue';
import QuestionPalette from './QuestionPalette.vue';
import SurveyNodeList from './SurveyNodeList.vue';
import { inspectorRequest } from './inspectorRequest';

const store = useFormStore();

const announcement = ref('');

const wideQuery = window.matchMedia('(min-width: 900px)');
const isWide = ref(wideQuery.matches);
const drawerOpen = ref(false);
const inspector = ref<InstanceType<typeof NodeInspector> | null>(null);

function onWideChange(e: MediaQueryListEvent): void {
  isWide.value = e.matches;
  if (e.matches) drawerOpen.value = false;
}

watch(inspectorRequest, async (req) => {
  if (!req) return;
  if (!isWide.value) {
    drawerOpen.value = true;
    return;
  }
  if (!req.focus) return;
  await nextTick();
  inspector.value?.focusFirstField();
});

watch(
  () => store.selectedNodeId,
  (id) => {
    if (id === null) drawerOpen.value = false;
  },
);

function onDrawerHide(e: Event): void {
  if (e.target === e.currentTarget) drawerOpen.value = false;
}

function returnFocusToCard(): void {
  if (!store.selectedNodeId) return;
  document.querySelector<HTMLElement>(`[data-node-id="${store.selectedNodeId}"]`)?.focus();
}

function onAnnounce(message: string): void {
  announcement.value = message;
}

const EDITABLE = new Set([
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'WA-INPUT',
  'WA-TEXTAREA',
  'WA-SELECT',
  'WA-CHECKBOX',
]);

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
  wideQuery.addEventListener('change', onWideChange);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
  wideQuery.removeEventListener('change', onWideChange);
});
</script>

<template>
  <div class="builder-canvas">
    <BuilderToolbar />
    <div class="builder-canvas-body">
      <QuestionPalette @announce="onAnnounce" />
      <div class="builder-canvas-tree" @click.self="store.selectNode(null)">
        <SurveyNodeList :parent-id="null" :nodes="store.document.survey" @announce="onAnnounce" />
      </div>
      <NodeInspector
        v-if="isWide"
        ref="inspector"
        class="inspector-sidebar"
        @escape="returnFocusToCard"
      />
    </div>
    <wa-drawer
      v-if="!isWide"
      :open="drawerOpen && !!store.selectedNodeId"
      placement="bottom"
      light-dismiss
      without-header
      class="inspector-drawer"
      label="Edit question"
      @wa-hide="onDrawerHide"
      @wa-after-hide="onDrawerHide"
    >
      <NodeInspector ref="inspector" closable @close="drawerOpen = false" />
    </wa-drawer>
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

  @include bp(lg) {
    flex-direction: row;
  }
}

.builder-canvas-tree {
  flex: 1;
  min-width: 0;
  padding: $spacing-md;
  overflow-y: auto;
}

.inspector-sidebar {
  flex-shrink: 0;
  width: 320px;
  border-left: 1px solid $color-border;

  @include bp(xl) {
    width: 400px;
  }
}

.inspector-drawer {
  --size: 75vh;

  &::part(body) {
    padding: 0;
  }
}
</style>
