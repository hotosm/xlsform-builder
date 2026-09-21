<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { useFormStore } from '@/stores/form';
import { friendlyErrorMessage } from '@/utils/errors';
import { exportToXlsx } from '@/utils/export';
import { collectNames } from '@/utils/tree';

defineProps<{ showAddQuestion?: boolean }>();
const emit = defineEmits<{ addQuestion: [] }>();

const store = useFormStore();

const isExporting = ref(false);
const exportError = ref('');
const confirmClearOpen = ref(false);

const questionCount = computed(() => collectNames(store.document.survey).length);

const savedAtLabel = computed(() => {
  if (store.lastSavedAt === null) return '';
  const time = new Date(store.lastSavedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return `Saved ${time}`;
});

async function waitForPaint(): Promise<void> {
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

async function handleExport(): Promise<void> {
  if (isExporting.value) return;
  isExporting.value = true;
  exportError.value = '';
  try {
    await waitForPaint();
    const data = exportToXlsx(store.document);
    const blob = new Blob([data as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${store.document.settings.formId || 'form'}.xlsx`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    exportError.value = friendlyErrorMessage(err);
  } finally {
    isExporting.value = false;
  }
}
</script>

<template>
  <div class="builder-toolbar">
    <wa-button
      v-if="showAddQuestion"
      variant="brand"
      size="s"
      title="Add question"
      @click="emit('addQuestion')"
    >
      <wa-icon slot="start" name="plus" aria-hidden="true"></wa-icon>
      Add question
    </wa-button>
    <wa-button
      variant="neutral"
      size="s"
      :disabled="!store.canUndo"
      title="Undo (Ctrl/Cmd+Z)"
      @click="store.undo()"
    >
      Undo
    </wa-button>
    <wa-button
      variant="neutral"
      size="s"
      :disabled="!store.canRedo"
      title="Redo (Ctrl/Cmd+Shift+Z)"
      @click="store.redo()"
    >
      Redo
    </wa-button>
    <wa-button
      appearance="outlined"
      variant="danger"
      size="s"
      :disabled="questionCount === 0"
      @click="confirmClearOpen = true"
    >
      <wa-icon slot="start" name="trash" aria-hidden="true"></wa-icon>
      Clear form
    </wa-button>
    <span v-if="savedAtLabel" class="draft-saved">{{ savedAtLabel }}</span>
    <wa-button
      variant="brand"
      size="s"
      class="export-button"
      :loading="isExporting"
      @click="handleExport"
    >
      Export
    </wa-button>
    <wa-callout v-if="exportError" class="export-error" variant="danger" size="s" role="alert">
      <wa-icon slot="icon" name="circle-exclamation" aria-hidden="true"></wa-icon>
      <div class="export-error-body">
        <span>{{ exportError }}</span>
        <wa-button appearance="plain" size="s" title="Dismiss error" @click="exportError = ''">
          <wa-icon name="xmark" label="Dismiss error"></wa-icon>
        </wa-button>
      </div>
    </wa-callout>

    <ConfirmDialog
      v-model:open="confirmClearOpen"
      label="Clear the whole form?"
      confirm-label="Clear form"
      @confirm="store.clearSurvey()"
    >
      <p>
        This removes all {{ questionCount }} question{{ questionCount === 1 ? '' : 's' }} and their
        choice lists. You can undo this.
      </p>
    </ConfirmDialog>
  </div>
</template>

<style scoped lang="scss">
.builder-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border-bottom: 1px solid $color-border;
  background: $color-bg-primary;
}

.export-button {
  margin-left: auto;
}

.draft-saved {
  color: $color-text-secondary;
  font-size: $font-size-small;
}

.export-error {
  flex-basis: 100%;
}

.export-error-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  font-size: $font-size-small;
}
</style>
