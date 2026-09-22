<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';

import { useBuilderUiStore } from '@/stores/builderUi';
import { useFormStore } from '@/stores/form';

import BuilderToolbar from './BuilderToolbar.vue';
import FormHeader from './FormHeader.vue';
import NodeInspector from './NodeInspector.vue';
import QuestionPalette from './QuestionPalette.vue';
import SurveyNodeList from './SurveyNodeList.vue';
import { findNodeElement } from './domSelectors';
import { WIDE_LAYOUT_QUERY, useMediaQuery } from './useMediaQuery';

const store = useFormStore();
const ui = useBuilderUiStore();

const announcement = ref('');

const isWide = useMediaQuery(WIDE_LAYOUT_QUERY);
const drawerOpen = ref(false);
const paletteOpen = ref(false);
const inspector = useTemplateRef('inspector');

watch(isWide, (wide) => {
  if (!wide) return;
  drawerOpen.value = false;
  paletteOpen.value = false;
});

watch(
  () => ui.inspectorRequest,
  async (req) => {
    if (!req?.focus) return;
    if (!isWide.value) {
      paletteOpen.value = false;
      drawerOpen.value = true;
      return;
    }
    await nextTick();
    inspector.value?.focusFirstField();
  },
);

watch(
  () => store.selectedNodeId,
  (id) => {
    if (id === null) drawerOpen.value = false;
  },
);

function onDrawerHide(e: Event): void {
  if (e.target === e.currentTarget) drawerOpen.value = false;
}

function onPaletteHide(e: Event): void {
  if (e.target === e.currentTarget) paletteOpen.value = false;
}

function returnFocusToCard(): void {
  if (!store.selectedNodeId) return;
  findNodeElement(store.selectedNodeId)?.focus();
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
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
});
</script>

<template>
  <div class="builder-canvas">
    <BuilderToolbar :show-add-question="!isWide" @add-question="paletteOpen = true" />
    <div class="builder-canvas-body">
      <QuestionPalette v-if="isWide" @announce="onAnnounce" />
      <div class="builder-canvas-tree" tabindex="-1" @click.self="store.selectNode(null)">
        <FormHeader />
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
    <wa-drawer
      v-if="!isWide"
      :open="paletteOpen"
      placement="bottom"
      light-dismiss
      without-header
      class="palette-drawer"
      label="Add question"
      @wa-hide="onPaletteHide"
      @wa-after-hide="onPaletteHide"
    >
      <QuestionPalette
        closable
        @announce="onAnnounce"
        @added="paletteOpen = false"
        @close="paletteOpen = false"
      />
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
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  padding: $spacing-md;
  overflow-y: auto;
}

.inspector-sidebar {
  flex-shrink: 0;
  width: 17.5rem;
  border-left: 1px solid $color-border;

  @include bp(xl) {
    width: 20rem;
  }

  @include bp(xxl) {
    width: 25rem;
  }
}

.inspector-drawer,
.palette-drawer {
  --size: 75dvh;

  &::part(body) {
    padding: 0;
  }
}

.palette-drawer .question-palette {
  height: 100%;
  border-right: 0;
}
</style>
