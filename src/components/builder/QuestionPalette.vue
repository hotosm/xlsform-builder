<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import { VueDraggable } from 'vue-draggable-plus';

import { useBuilderUiStore } from '@/stores/builderUi';
import { useFormStore } from '@/stores/form';
import { localizedText } from '@/utils/localized';
import { findNode } from '@/utils/tree';

import { findNodeElement } from './domSelectors';
import { PALETTE_ITEMS, type PaletteItem, clonePaletteItem, paletteTarget } from './dragHandlers';

const emit = defineEmits<{ announce: [message: string] }>();

const store = useFormStore();
const ui = useBuilderUiStore();

function cloneItem(item: PaletteItem): ReturnType<typeof clonePaletteItem> {
  return clonePaletteItem(item, store.document.survey);
}

interface PaletteCategory {
  label: string;
  items: PaletteItem[];
}

const categories: PaletteCategory[] = Object.values(
  PALETTE_ITEMS.reduce<Record<string, PaletteCategory>>((acc, item) => {
    (acc[item.category] ??= { label: item.category, items: [] }).items.push(item);
    return acc;
  }, {}),
);

const expandedCategories = ref<Set<string>>(new Set());

const searchQuery = ref('');

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase());

const matchedItems = computed(() => {
  const q = normalizedQuery.value;
  if (!q) return new Set(PALETTE_ITEMS);
  return new Set(
    PALETTE_ITEMS.filter((item) =>
      [item.label, item.type, ...(item.keywords ?? [])].some((term) =>
        term.toLowerCase().includes(q),
      ),
    ),
  );
});

const matchCounts = computed(
  () =>
    new Map(
      categories.map((cat) => [
        cat.label,
        cat.items.filter((item) => matchedItems.value.has(item)).length,
      ]),
    ),
);

const visibleCategories = computed(() =>
  categories.filter((cat) => (matchCounts.value.get(cat.label) ?? 0) > 0),
);

watch(normalizedQuery, (q) => {
  if (!q) return;
  for (const cat of visibleCategories.value) expandedCategories.value.add(cat.label);
});

function isExpanded(cat: PaletteCategory): boolean {
  return expandedCategories.value.has(cat.label);
}

function setExpanded(cat: PaletteCategory, open: boolean): void {
  if (open) {
    expandedCategories.value.add(cat.label);
  } else {
    expandedCategories.value.delete(cat.label);
  }
}

const insertHint = computed(() => {
  const selected = store.selectedNodeId
    ? findNode(store.document.survey, store.selectedNodeId)
    : null;
  if (!selected) return 'Adds to the end of the form';
  const selectedLabel = localizedText(selected.label, selected.name);
  if (selected.type === 'group' || selected.type === 'repeat') {
    return `Adds inside "${selectedLabel}"`;
  }
  return `Adds after "${selectedLabel}"`;
});

function onDragStart(): void {
  store.beginHistoryBatch();
  ui.setDragging(true);
}

function onDragEnd(): void {
  store.endHistoryBatch();
  ui.setDragging(false);
}

function addItem(item: PaletteItem): void {
  const { parentId, index } = paletteTarget(store.document.survey, store.selectedNodeId);
  const node = store.addNode(item.type, parentId, index);
  emit('announce', `${item.label} question added`);
  ui.requestInspector(node.id, false);
  void nextTick(() => findNodeElement(node.id)?.scrollIntoView({ block: 'nearest' }));
}
</script>

<template>
  <aside class="question-palette">
    <div class="palette-header">
      <h3 class="palette-heading">Add Question</h3>
      <p class="palette-insert-hint">{{ insertHint }}</p>
    </div>
    <wa-input
      v-model="searchQuery"
      type="search"
      size="s"
      with-clear
      placeholder="Search question types…"
      aria-label="Search question types"
    >
      <wa-icon slot="start" name="magnifying-glass" aria-hidden="true"></wa-icon>
    </wa-input>
    <p v-if="searchQuery.trim() && visibleCategories.length === 0" class="palette-no-results">
      No question types match "{{ searchQuery }}".
    </p>
    <wa-accordion class="palette-groups" appearance="plain" heading-level="4">
      <wa-accordion-item
        v-for="cat in visibleCategories"
        :key="cat.label"
        class="palette-group"
        :expanded="isExpanded(cat)"
        @wa-accordion-item-expanded="setExpanded(cat, true)"
        @wa-accordion-item-collapsed="setExpanded(cat, false)"
      >
        <span slot="label" class="palette-category">
          <span class="palette-category-label">{{ cat.label }}</span>
          <wa-badge appearance="filled" variant="neutral" pill>
            {{ matchCounts.get(cat.label) }}
          </wa-badge>
        </span>
        <VueDraggable
          :model-value="cat.items"
          class="palette-list"
          :group="{ name: 'survey-tree', pull: 'clone', put: false }"
          :clone="cloneItem"
          :sort="false"
          :delay="200"
          :delay-on-touch-only="true"
          @start="onDragStart"
          @end="onDragEnd"
        >
          <wa-button
            v-for="item in cat.items"
            v-show="matchedItems.has(item)"
            :key="item.type"
            class="palette-item"
            appearance="outlined"
            variant="neutral"
            @click="addItem(item)"
          >
            <wa-icon slot="start" :name="item.icon" aria-hidden="true"></wa-icon>
            <span class="palette-item-label">{{ item.label }}</span>
            <span class="palette-item-description">{{ item.description }}</span>
          </wa-button>
        </VueDraggable>
      </wa-accordion-item>
    </wa-accordion>
  </aside>
</template>

<style scoped lang="scss">
.question-palette {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  width: 100%;
  min-height: 0;
  padding: $spacing-md;
  border-right: 1px solid $color-border;
  background: $color-bg-primary;

  @include bp(lg) {
    flex-shrink: 0;
    width: 272px;
  }
}

.palette-header {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.palette-heading {
  margin: 0;
  color: $color-text-heading;
  font-size: $font-size-small;
  font-weight: $font-weight-semibold;
  text-transform: uppercase;
  letter-spacing: $letter-spacing-loose;
}

.palette-insert-hint {
  margin: 0;
  overflow: hidden;
  color: $color-text-secondary;
  font-size: $font-size-x-small;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette-no-results {
  margin: 0;
  color: $color-text-secondary;
  font-size: $font-size-small;
}

.palette-groups {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.palette-group {
  --spacing: #{$spacing-sm};

  &::part(button) {
    border-radius: $border-radius;
    transition: background-color 0.15s ease;
  }

  &::part(button):hover {
    background: $color-bg-surface;
  }
  &::part(content) {
    padding-inline: 0;
  }
}

.palette-category {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  width: 100%;
  color: $color-text-heading;
  font-size: $font-size-small;
  font-weight: $font-weight-semibold;
}

.palette-category-label {
  flex: 1;
}

.palette-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  margin-top: $spacing-xs;
}

.palette-item {
  display: block;
  width: 100%;

  &::part(button) {
    justify-content: flex-start;
    gap: $spacing-sm;
    height: auto;
    min-height: var(--wa-form-control-height);
    padding: $spacing-sm;
    white-space: normal;
    text-align: left;
    cursor: grab;
  }

  &::part(button):active {
    cursor: grabbing;
  }

  &::part(start) {
    align-self: flex-start;
    padding-top: 2px;
  }

  &::part(label) {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
}

.palette-item-label {
  font-size: $font-size-small;
  font-weight: $font-weight-semibold;
}

.palette-item-description {
  color: $color-text-secondary;
  font-size: $font-size-x-small;
  font-weight: $font-weight-normal;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
</style>
