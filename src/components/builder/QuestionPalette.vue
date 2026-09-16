<script setup lang="ts">
import { ref } from 'vue';

import { VueDraggable } from 'vue-draggable-plus';

import { useFormStore } from '@/stores/form';

import { PALETTE_ITEMS, type PaletteItem, clonePaletteItem, paletteTarget } from './dragHandlers';

const store = useFormStore();

const paletteItems = ref<PaletteItem[]>([...PALETTE_ITEMS]);

function addItem(item: PaletteItem): void {
  const { parentId, index } = paletteTarget(store.document.survey, store.selectedNodeId);
  store.addNode(item.type, parentId, index);
}
</script>

<template>
  <aside class="question-palette">
    <h3 class="palette-heading">Add Question</h3>
    <VueDraggable
      v-model="paletteItems"
      class="palette-list"
      :group="{ name: 'survey-tree', pull: 'clone', put: false }"
      :clone="clonePaletteItem"
      :sort="false"
    >
      <button
        v-for="item in paletteItems"
        :key="item.type"
        type="button"
        class="palette-item"
        @click="addItem(item)"
      >
        {{ item.label }}
      </button>
    </VueDraggable>
  </aside>
</template>

<style scoped lang="scss">
.question-palette {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  width: 220px;
  padding: $spacing-md;
  border-right: 1px solid $color-border;
  background: $color-bg-primary;
}

.palette-heading {
  margin: 0 0 $spacing-xs 0;
  color: $color-text-heading;
  font-size: $font-size-small;
  font-weight: $font-weight-semibold;
  text-transform: uppercase;
  letter-spacing: $letter-spacing-loose;
}

.palette-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.palette-item {
  display: block;
  width: 100%;
  padding: $spacing-sm $spacing-md;
  border: 1px solid $color-border;
  border-radius: $border-radius;
  background: $color-bg-surface;
  color: $color-text-primary;
  font-size: $font-size-small;
  font-family: $font-family-base;
  text-align: left;
  cursor: grab;

  &:hover {
    border-color: $color-primary;
    background: $color-primary-50;
  }

  &:active {
    cursor: grabbing;
  }

  &:focus-visible {
    outline: 2px solid $color-primary;
    outline-offset: 2px;
  }
}
</style>
