<script setup lang="ts">
import { computed } from 'vue';

import { type DraggableEvent, VueDraggable } from 'vue-draggable-plus';

import { useFormStore } from '@/stores/form';
import type { SurveyNode } from '@/types/xlsform';
import { localizedText } from '@/utils/localized';

import SurveyNodeCard from './SurveyNodeCard.vue';
import { commitDroppedNode, isDragging } from './dragHandlers';
import { requestInspector } from './inspectorRequest';

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
  if (event.from.closest('.question-palette')) requestInspector(node.id, true);
  emit('announce', `${localizedText(node.label, node.name)} added`);
}

function onAnnounce(message: string): void {
  emit('announce', message);
}

function onDragStart(): void {
  store.beginHistoryBatch();
  isDragging.value = true;
}

function onDragEnd(): void {
  store.endHistoryBatch();
  isDragging.value = false;
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
      {{ isRoot ? 'Drag a question here, or click one in the palette' : 'Drop questions here' }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.survey-node-list-wrapper {
  position: relative;
}

.survey-node-list-wrapper.root-fill {
  display: flex;
  flex-direction: column;
  min-height: 100%;
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
  border: 2px dashed $color-primary;
  border-radius: $border-radius;
  background: $color-primary-50;
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
  pointer-events: none;
}
</style>
