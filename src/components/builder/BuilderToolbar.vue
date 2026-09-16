<script setup lang="ts">
import { exportToXlsx } from '@/utils/export';
import { useFormStore } from '@/stores/form';

const store = useFormStore();

function handleExport(): void {
  const data = exportToXlsx(store.document);
  const blob = new Blob([data as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${store.document.settings.formId || 'form'}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="builder-toolbar">
    <wa-button variant="neutral" size="s" :disabled="!store.canUndo" @click="store.undo()">
      Undo
    </wa-button>
    <wa-button variant="neutral" size="s" :disabled="!store.canRedo" @click="store.redo()">
      Redo
    </wa-button>
    <wa-button variant="danger" size="s" class="export-button" @click="handleExport">
      Export
    </wa-button>
  </div>
</template>

<style scoped lang="scss">
.builder-toolbar {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border-bottom: 1px solid $color-border;
  background: $color-bg-primary;
}

.export-button {
  margin-left: auto;
}
</style>
