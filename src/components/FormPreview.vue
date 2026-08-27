<script setup lang="ts">
import type { XLSFormDocument, SurveyNode } from '@/types/xlsform';

defineProps<{
  document: XLSFormDocument;
}>();

function getChoiceLabels(listName: string, doc: XLSFormDocument): string[] {
  const list = doc.choices.find((c) => c.listName === listName);
  if (!list) return [];
  return list.choices.map((c) => (typeof c.label === 'string' ? c.label : Object.values(c.label)[0]));
}

function getLabel(node: SurveyNode): string {
  if (typeof node.label === 'string') return node.label;
  return Object.values(node.label)[0] || node.name;
}

function isSelectType(type: string): boolean {
  return type === 'select_one' || type === 'select_multiple';
}

function isContainer(type: string): boolean {
  return type === 'group' || type === 'repeat';
}
</script>

<template>
  <div class="form-preview">
    <div class="preview-section">
      <h3>Survey Questions</h3>
      <div class="node-list">
        <template v-for="node in document.survey" :key="node.id">
          <div v-if="isContainer(node.type)" class="node-container">
            <div class="node-row container-header">
              <wa-badge appearance="filled">{{ node.type }}</wa-badge>
              <span class="node-label">{{ getLabel(node) }}</span>
              <span class="node-name">{{ node.name }}</span>
            </div>
            <div class="node-children">
              <div v-for="child in node.children" :key="child.id" class="node-row">
                <wa-badge appearance="outlined">{{ child.type }}</wa-badge>
                <span class="node-label">
                  {{ getLabel(child) }}
                  <span v-if="child.required === 'true'" class="required-mark">*</span>
                </span>
                <span class="node-name">{{ child.name }}</span>
                <div v-if="isSelectType(child.type) && child.listName" class="choice-list">
                  <span v-for="label in getChoiceLabels(child.listName, document)" :key="label" class="choice-item">{{ label }}</span>
                </div>
                <div v-if="child.relevant" class="relevant-text">Shown when: {{ child.relevant }}</div>
              </div>
            </div>
          </div>
          <div v-else class="node-row">
            <wa-badge appearance="outlined">{{ node.type }}</wa-badge>
            <span class="node-label">
              {{ getLabel(node) }}
              <span v-if="node.required === 'true'" class="required-mark">*</span>
            </span>
            <span class="node-name">{{ node.name }}</span>
            <div v-if="isSelectType(node.type) && node.listName" class="choice-list">
              <span v-for="label in getChoiceLabels(node.listName, document)" :key="label" class="choice-item">{{ label }}</span>
            </div>
            <div v-if="node.relevant" class="relevant-text">Shown when: {{ node.relevant }}</div>
          </div>
        </template>
      </div>
    </div>

    <div class="preview-section">
      <h3>Form Settings</h3>
      <div class="settings-grid">
        <div class="setting-row">
          <span class="setting-label">Title:</span>
          <span>{{ document.settings.formTitle }}</span>
        </div>
        <div class="setting-row">
          <span class="setting-label">Form ID:</span>
          <code>{{ document.settings.formId }}</code>
        </div>
        <div v-if="document.settings.version" class="setting-row">
          <span class="setting-label">Version:</span>
          <span>{{ document.settings.version }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.form-preview {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.preview-section {
  h3 {
    margin: 0 0 $spacing-md 0;
    color: $color-text-primary;
    font-size: $font-size-large;
    font-weight: $font-weight-semibold;
  }
}

.node-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.node-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border-radius: $border-radius;
  background: $color-bg-surface;
}

.node-container {
  border-left: 3px solid #d42a38;
  border-radius: $border-radius;

  .container-header {
    background: rgba(212, 42, 56, 0.05);
    font-weight: $font-weight-semibold;
  }
}

.node-children {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-xs 0 $spacing-xs $spacing-md;
}

.node-label {
  flex: 1;
  color: $color-text-primary;
}

.node-name {
  font-size: $font-size-small;
  color: $color-text-primary;
  opacity: 0.5;
  font-family: monospace;
}

.required-mark {
  color: #d42a38;
  font-weight: bold;
}

.choice-list {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  padding-left: $spacing-lg;
}

.choice-item {
  font-size: $font-size-small;
  background: $color-bg-surface;
  border: 1px solid rgba($color-text-primary, 0.1);
  padding: 2px $spacing-sm;
  border-radius: $border-radius;
}

.relevant-text {
  width: 100%;
  font-size: $font-size-small;
  font-style: italic;
  color: $color-text-primary;
  opacity: 0.7;
  padding-left: $spacing-lg;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.setting-row {
  display: flex;
  gap: $spacing-sm;
  align-items: center;
}

.setting-label {
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

code {
  background: $color-bg-surface;
  padding: 2px $spacing-sm;
  border-radius: $border-radius;
  font-size: $font-size-small;
}
</style>
