<script setup lang="ts">
import { ref, watch } from 'vue';

import { useFormStore } from '@/stores/form';

const store = useFormStore();

const title = ref('');
const titleError = ref('');
const titleFocused = ref(false);

function reset(): void {
  title.value = store.document.settings.formTitle;
  titleError.value = '';
}

watch(() => store.document.settings, reset, { immediate: true });

function commitTitle(): void {
  const trimmed = title.value.trim();
  if (!trimmed) {
    titleError.value = 'Title is required.';
    return;
  }
  titleError.value = '';
  if (trimmed !== store.document.settings.formTitle) store.updateSettings({ formTitle: trimmed });
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    (event.currentTarget as HTMLElement).blur();
  } else if (event.key === 'Escape') {
    reset();
    (event.currentTarget as HTMLElement).blur();
  }
}
</script>

<template>
  <header class="form-header">
    <wa-input
      v-model="title"
      class="form-title-input"
      aria-label="Form title"
      :aria-invalid="!!titleError"
      @change="commitTitle"
      @keydown="onKeydown"
      @focus="titleFocused = true"
      @blur="titleFocused = false"
    >
      <wa-icon slot="end" class="edit-icon" name="pen" aria-hidden="true"></wa-icon>
      <span
        v-if="titleError || titleFocused"
        slot="hint"
        :class="{ 'field-error': titleError }"
        :role="titleError ? 'alert' : undefined"
      >
        {{ titleError || 'Shown to data collectors when they pick a form. Also sets the form ID.' }}
      </span>
    </wa-input>
    <p class="form-id">
      <span class="form-id-prefix">Form ID</span>
      <code>{{ store.document.settings.formId }}</code>
    </p>
  </header>
</template>

<style scoped lang="scss">
.form-header {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  margin-bottom: $spacing-md;
}

.form-title-input {
  &::part(input-wrapper) {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    transition: border-color 0.15s ease;
  }

  &:hover::part(input-wrapper) {
    border-color: $color-border-light;
  }

  &:focus-within::part(input-wrapper) {
    border-color: $color-neutral-700;
    background: $color-bg-card;
  }

  @media (pointer: coarse) {
    &::part(input-wrapper) {
      border-color: $color-border;
    }
  }

  &::part(input) {
    color: $color-text-heading;
    font-size: $font-size-x-large;
    font-weight: $font-weight-semibold;
  }

  &:focus-within .edit-icon {
    visibility: hidden;
  }
}

.edit-icon {
  color: $color-text-secondary;
  font-size: $font-size-small;
  pointer-events: none;
}

.form-id {
  display: flex;
  align-items: baseline;
  gap: $spacing-sm;
  margin: 0;
  padding-inline: $spacing-md;
  color: $color-text-secondary;
  font-size: $font-size-small;
  overflow-wrap: anywhere;
}

.form-id-prefix {
  font-size: $font-size-x-small;
  font-weight: $font-weight-semibold;
}

.field-error {
  color: var(--wa-color-danger-on-quiet);
  font-weight: $font-weight-semibold;
}
</style>
