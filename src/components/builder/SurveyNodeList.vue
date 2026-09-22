<script setup lang="ts">
import { computed } from 'vue';

import { type DraggableEvent, VueDraggable } from 'vue-draggable-plus';

import { useBuilderUiStore } from '@/stores/builderUi';
import { useFormStore } from '@/stores/form';
import type { SurveyNode } from '@/types/xlsform';
import { localizedText } from '@/utils/localized';

import SurveyNodeCard from './SurveyNodeCard.vue';
import { PALETTE_SELECTOR } from './domSelectors';
import { commitDroppedNode } from './dragHandlers';

defineOptions({ name: 'SurveyNodeList' });

const props = withDefaults(
  defineProps<{
    parentId: string | null;
    nodes: SurveyNode[];
    level?: number;
  }>(),
  { level: 1 },
);

const emit = defineEmits<{ announce: [message: string] }>();

const store = useFormStore();
const ui = useBuilderUiStore();

const isRoot = computed(() => props.parentId === null);

const model = computed<SurveyNode[]>({
  get: () => props.nodes,
  set: (value) => {
    store.replaceChildren(props.parentId, value);
  },
});

function onAdd(event: DraggableEvent<SurveyNode>): void {
  const node = event.clonedData ?? event.data;
  commitDroppedNode(store, node);
  if (event.from.closest(PALETTE_SELECTOR)) ui.requestInspector(node.id, true);
  emit('announce', `${localizedText(node.label, node.name)} added`);
}

function onAnnounce(message: string): void {
  emit('announce', message);
}

function onDragStart(): void {
  store.beginHistoryBatch();
  ui.setDragging(true);
}

function onDragEnd(): void {
  store.endHistoryBatch();
  ui.setDragging(false);
}
</script>

<template>
  <div class="survey-node-list-wrapper" :class="{ 'root-fill': isRoot }">
    <VueDraggable
      v-model="model"
      class="survey-node-list"
      :class="{ 'is-empty': nodes.length === 0, 'root-fill': isRoot }"
      :role="isRoot ? 'tree' : 'group'"
      group="survey-tree"
      :animation="150"
      handle=".node-drag-handle"
      :delay="200"
      :delay-on-touch-only="true"
      ghost-class="drop-indicator"
      @start="onDragStart"
      @end="onDragEnd"
      @add="onAdd"
    >
      <div v-for="node in model" :key="node.id" class="survey-node-list-item">
        <SurveyNodeCard :node="node" :level="level" @announce="onAnnounce" />
        <div v-if="node.type === 'group' || node.type === 'repeat'" class="survey-node-children">
          <SurveyNodeList
            :parent-id="node.id"
            :nodes="node.children ?? []"
            :level="level + 1"
            @announce="onAnnounce"
          />
        </div>
      </div>
    </VueDraggable>
    <p v-if="nodes.length === 0" class="empty-drop-hint">
      <template v-if="isRoot">
        <span class="hint-wide">Drag a question here, or click one in the palette</span>
        <span class="hint-narrow">Tap + to add your first question</span>
      </template>
      <template v-else>Drop questions here</template>
    </p>
  </div>
</template>

<style scoped lang="scss">
.survey-node-list-wrapper {
  position: relative;
}

.survey-node-list-wrapper.root-fill {
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
}

.survey-node-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.survey-node-list.root-fill {
  flex: 1;
}

.survey-node-list.is-empty {
  min-height: 48px;
  border: 1px dashed $color-border-light;
  border-radius: $border-radius;
}

.survey-node-list :deep(.drop-indicator) {
  border: 2px dashed $color-neutral-400;
  border-radius: $border-radius;
  background: $color-bg-surface;
  opacity: 0.6;

  > * {
    visibility: hidden;
  }
}

.survey-node-list-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.survey-node-children {
  padding: $spacing-xs $spacing-xs $spacing-xs $spacing-md;
  margin-left: $spacing-sm;
  border-left: 2px solid $color-border;
  background: $color-bg-primary;
  border-radius: 0 $border-radius $border-radius 0;
}

.empty-drop-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: $color-text-secondary;
  font-size: $font-size-small;
  text-align: center;
  pointer-events: none;
}

.hint-wide {
  display: none;

  @include bp(lg) {
    display: inline;
  }
}

.hint-narrow {
  @include bp(lg) {
    display: none;
  }
}
</style>
