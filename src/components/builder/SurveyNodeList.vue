<script setup lang="ts">
import { computed } from 'vue';

import { type DraggableEvent, VueDraggable } from 'vue-draggable-plus';

import type { SurveyNode } from '@/types/xlsform';
import { useFormStore } from '@/stores/form';

import { commitDroppedNode } from './dragHandlers';
import SurveyNodeCard from './SurveyNodeCard.vue';

defineOptions({ name: 'SurveyNodeList' });

const props = defineProps<{
  parentId: string | null;
  nodes: SurveyNode[];
}>();

const emit = defineEmits<{ announce: [message: string] }>();

const store = useFormStore();

const model = computed<SurveyNode[]>({
  get: () => props.nodes,
  set: (value) => {
    store.replaceChildren(props.parentId, value);
  },
});

function onAdd(event: DraggableEvent<SurveyNode>): void {
  commitDroppedNode(store, event.clonedData ?? event.data);
}

function onAnnounce(message: string): void {
  emit('announce', message);
}
</script>

<template>
  <div class="survey-node-list-wrapper">
    <VueDraggable
      v-model="model"
      class="survey-node-list"
      :class="{ 'is-empty': nodes.length === 0 }"
      group="survey-tree"
      :animation="150"
      handle=".node-drag-handle"
      @start="store.beginHistoryBatch()"
      @end="store.endHistoryBatch()"
      @add="onAdd"
    >
      <div v-for="node in model" :key="node.id" class="survey-node-list-item">
        <SurveyNodeCard :node="node" @announce="onAnnounce" />
        <div v-if="node.type === 'group' || node.type === 'repeat'" class="survey-node-children">
          <SurveyNodeList :parent-id="node.id" :nodes="node.children ?? []" @announce="onAnnounce" />
        </div>
      </div>
    </VueDraggable>
    <p v-if="nodes.length === 0" class="empty-drop-hint">Drop questions here</p>
  </div>
</template>

<style scoped lang="scss">
.survey-node-list-wrapper {
  position: relative;
}

.survey-node-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.survey-node-list.is-empty {
  min-height: 48px;
  border: 1px dashed $color-border-light;
  border-radius: $border-radius;
}

.survey-node-list-item {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.survey-node-children {
  padding-left: $spacing-lg;
}

.empty-drop-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: $color-text-primary;
  opacity: 0.6;
  font-size: $font-size-small;
  pointer-events: none;
}
</style>
