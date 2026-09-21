<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import { useFormStore } from '@/stores/form';
import type { SurveyNode } from '@/types/xlsform';
import { localizedText } from '@/utils/localized';
import { findParent } from '@/utils/tree';

import { PALETTE_LABELS } from './dragHandlers';
import { requestInspector } from './inspectorRequest';

const props = defineProps<{ node: SurveyNode; level: number }>();
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

function announceMove(direction: MoveDirection): void {
  applyMove(direction);
  if (direction === 'in' || direction === 'out') {
    void nextTick(() => focusNode(props.node.id));
  }
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

const childCount = computed(() => props.node.children?.length ?? 0);

function focusNode(nodeId: string | null): void {
  const selector = nodeId ? `[data-node-id="${nodeId}"]` : '.builder-canvas-tree';
  const target = document.querySelector<HTMLElement>(selector);
  target?.focus();
}

const confirmDeleteOpen = ref(false);

const deleteConfirmMessage = computed(() => {
  const nodeLabel = localizedText(props.node.label, props.node.name);
  return `Delete "${nodeLabel}" and its ${childCount.value} question${childCount.value === 1 ? '' : 's'} inside it? This can be undone with Ctrl/Cmd+Z.`;
});

function performDelete(): void {
  const nodeLabel = localizedText(props.node.label, props.node.name);
  const b = boundary.value;
  const nextFocusId = b && b.index > 0 ? b.children[b.index - 1].id : (b?.parent?.id ?? null);
  store.removeNode(props.node.id);
  emit('announce', `${nodeLabel} deleted`);
  void nextTick(() => focusNode(nextFocusId));
}

function onDelete(): void {
  if (childCount.value > 0) {
    confirmDeleteOpen.value = true;
    return;
  }
  performDelete();
}

function confirmDelete(): void {
  confirmDeleteOpen.value = false;
  performDelete();
}

function select(focusInspector: boolean): void {
  store.selectNode(props.node.id);
  requestInspector(props.node.id, focusInspector);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    select(event.key === 'Enter');
    return;
  }
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
    onDelete();
  }
}
</script>

<template>
  <div
    class="survey-node-card"
    :class="{ selected }"
    role="treeitem"
    :aria-selected="selected"
    :aria-level="level"
    :data-node-id="node.id"
    tabindex="0"
    @click.stop="select(false)"
    @keydown="onKeydown"
  >
    <wa-icon
      name="grip-vertical"
      class="node-drag-handle"
      title="Drag to reorder"
      aria-hidden="true"
    ></wa-icon>
    <wa-badge appearance="outlined">{{ PALETTE_LABELS[node.type] ?? node.type }}</wa-badge>
    <span class="node-label">
      {{ localizedText(node.label, node.name) }}
      <span v-if="node.required === 'true'" class="required-mark" title="Required">
        *
        <span class="sr-only">Required</span>
      </span>
    </span>
    <span class="node-name">{{ node.name }}</span>

    <Transition name="controls">
      <div v-if="selected" class="node-controls">
        <wa-button
          appearance="outlined"
          size="s"
          :disabled="!canMoveUp"
          title="Move up (Alt+↑)"
          @click.stop="announceMove('up')"
        >
          <wa-icon name="arrow-up" label="Move up"></wa-icon>
        </wa-button>
        <wa-button
          appearance="outlined"
          size="s"
          :disabled="!canMoveDown"
          title="Move down (Alt+↓)"
          @click.stop="announceMove('down')"
        >
          <wa-icon name="arrow-down" label="Move down"></wa-icon>
        </wa-button>
        <wa-button
          v-if="canMoveIn"
          appearance="outlined"
          size="s"
          title="Nest into previous group (Alt+→)"
          @click.stop="announceMove('in')"
        >
          <wa-icon name="indent" label="Nest into previous group"></wa-icon>
        </wa-button>
        <wa-button
          v-if="canMoveOut"
          appearance="outlined"
          size="s"
          title="Move out of group (Alt+←)"
          @click.stop="announceMove('out')"
        >
          <wa-icon name="outdent" label="Move out of group"></wa-icon>
        </wa-button>
        <wa-button
          appearance="outlined"
          variant="danger"
          size="s"
          title="Delete (Backspace)"
          @click.stop="onDelete"
        >
          <wa-icon name="trash" label="Delete question"></wa-icon>
        </wa-button>
      </div>
    </Transition>

    <wa-dialog
      :open="confirmDeleteOpen"
      label="Delete question"
      @click.stop
      @wa-after-hide="confirmDeleteOpen = false"
    >
      <p>{{ deleteConfirmMessage }}</p>
      <div slot="footer" class="dialog-footer">
        <wa-button variant="neutral" @click.stop="confirmDeleteOpen = false">Cancel</wa-button>
        <wa-button variant="danger" @click.stop="confirmDelete">Delete</wa-button>
      </div>
    </wa-dialog>
  </div>
</template>

<style scoped lang="scss">
$node-control-size: 1.875rem;
$node-control-size-touch: 44px;

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
  min-height: calc(#{$node-control-size} + 2 * #{$spacing-sm} + 2px);
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;

  @media (max-width: #{$bp-md - 1px}) {
    min-height: calc(#{$node-control-size-touch} + 2 * #{$spacing-sm} + 2px);
  }

  &:hover:not(.selected) {
    border-color: $color-border-light;
    background: $color-bg-primary;
  }

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
  color: $color-text-secondary;

  &:active {
    cursor: grabbing;
  }
}

.node-label {
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.required-mark {
  color: $color-primary;
  font-weight: $font-weight-bold;
}

.node-name {
  color: $color-text-secondary;
  font-size: $font-size-small;
}

.node-controls {
  display: flex;
  gap: $spacing-xs;
  margin-left: auto;

  wa-button {
    --wa-form-control-height: #{$node-control-size};
  }

  @media (max-width: #{$bp-md - 1px}) {
    wa-button {
      --wa-form-control-height: #{$node-control-size-touch};
    }
  }
}

.controls-enter-active,
.controls-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.controls-enter-from,
.controls-leave-to {
  opacity: 0;
  transform: translateX(4px);
}

@media (prefers-reduced-motion: reduce) {
  .controls-enter-active,
  .controls-leave-active {
    transition: none;
  }
}

.dialog-footer {
  display: flex;
  gap: $spacing-md;
  justify-content: flex-end;
  width: 100%;
}
</style>
