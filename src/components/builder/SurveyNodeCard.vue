<script setup lang="ts">
import { computed } from 'vue';

import type { SurveyNode } from '@/types/xlsform';
import { localizedText } from '@/utils/localized';
import { findParent } from '@/utils/tree';
import { useFormStore } from '@/stores/form';

const props = defineProps<{ node: SurveyNode }>();
const emit = defineEmits<{ announce: [message: string] }>();

const store = useFormStore();

const selected = computed(() => store.selectedNodeId === props.node.id);

const boundary = computed(() => findParent(store.document.survey, props.node.id));

const canMoveUp = computed(() => !!boundary.value && boundary.value.index > 0);
const canMoveDown = computed(
  () => !!boundary.value && boundary.value.index < boundary.value.children.length - 1,
);
const canMoveIn = computed(() => {
  const b = boundary.value;
  if (!b || b.index === 0) return false;
  const previousSibling = b.children[b.index - 1];
  return previousSibling.type === 'group' || previousSibling.type === 'repeat';
});
const canMoveOut = computed(() => !!boundary.value && boundary.value.parent !== null);

type MoveDirection = 'up' | 'down' | 'in' | 'out';

const MOVE_VERBS: Record<MoveDirection, string> = {
  up: 'moved up',
  down: 'moved down',
  in: 'moved in',
  out: 'moved out',
};

function applyMove(direction: MoveDirection): void {
  switch (direction) {
    case 'up':
      store.moveNodeUp(props.node.id);
      break;
    case 'down':
      store.moveNodeDown(props.node.id);
      break;
    case 'in':
      store.moveNodeIn(props.node.id);
      break;
    case 'out':
      store.moveNodeOut(props.node.id);
      break;
  }
}

function onMoveClick(direction: MoveDirection): void {
  applyMove(direction);
}

function announceMove(direction: MoveDirection): void {
  applyMove(direction);
  const result = findParent(store.document.survey, props.node.id);
  if (!result) return;
  const parentLabel = result.parent
    ? localizedText(result.parent.label, result.parent.name)
    : 'the survey';
  const nodeLabel = localizedText(props.node.label, props.node.name);
  emit(
    'announce',
    `${nodeLabel} ${MOVE_VERBS[direction]}, position ${result.index + 1} of ${result.children.length} in ${parentLabel}`,
  );
}

function onKeydown(event: KeyboardEvent): void {
  if (event.altKey && event.key === 'ArrowUp') {
    event.preventDefault();
    announceMove('up');
    return;
  }
  if (event.altKey && event.key === 'ArrowDown') {
    event.preventDefault();
    announceMove('down');
    return;
  }
  if (event.altKey && event.key === 'ArrowRight') {
    event.preventDefault();
    announceMove('in');
    return;
  }
  if (event.altKey && event.key === 'ArrowLeft') {
    event.preventDefault();
    announceMove('out');
    return;
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    store.removeNode(props.node.id);
  }
}
</script>

<template>
  <div
    class="survey-node-card"
    :class="{ selected }"
    role="treeitem"
    :aria-selected="selected"
    tabindex="0"
    @click.stop="store.selectNode(node.id)"
    @keydown="onKeydown"
  >
    <span class="node-drag-handle" aria-hidden="true">⠿</span>
    <wa-badge appearance="outlined">{{ node.type }}</wa-badge>
    <span class="node-label">{{ localizedText(node.label, node.name) }}</span>
    <span class="node-name">{{ node.name }}</span>

    <div v-if="selected" class="node-controls">
      <button type="button" :disabled="!canMoveUp" aria-label="Move up" @click.stop="onMoveClick('up')">
        ↑
      </button>
      <button
        type="button"
        :disabled="!canMoveDown"
        aria-label="Move down"
        @click.stop="onMoveClick('down')"
      >
        ↓
      </button>
      <button type="button" :disabled="!canMoveIn" aria-label="Move in" @click.stop="onMoveClick('in')">
        →
      </button>
      <button
        type="button"
        :disabled="!canMoveOut"
        aria-label="Move out"
        @click.stop="onMoveClick('out')"
      >
        ←
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.survey-node-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border: 1px solid transparent;
  border-radius: $border-radius;
  background: $color-bg-surface;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid $color-primary;
    outline-offset: 2px;
  }

  &.selected {
    border-color: $color-primary;
    background: $color-primary-50;
  }
}

.node-drag-handle {
  cursor: grab;
  color: $color-text-primary;
  opacity: 0.5;

  &:active {
    cursor: grabbing;
  }
}

.node-label {
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.node-name {
  color: $color-text-primary;
  opacity: 0.6;
  font-size: $font-size-small;
}

.node-controls {
  display: flex;
  gap: $spacing-xs;
  margin-left: auto;

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid $color-border;
    border-radius: $border-radius;
    background: $color-bg-primary;
    color: $color-text-primary;
    cursor: pointer;

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    &:hover:not(:disabled) {
      border-color: $color-primary;
    }

    &:focus-visible {
      outline: 2px solid $color-primary;
      outline-offset: 2px;
    }
  }
}
</style>
