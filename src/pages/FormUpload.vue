<script setup lang="ts">
import '@hotosm/ui/dist/components/file-input-dropzone/file-input-dropzone.js';
import '@webawesome/button/button.js';
import '@webawesome/dialog/dialog.js';
import '@webawesome/icon/icon.js';
import '@webawesome/input/input.js';
import '@webawesome/textarea/textarea.js';

import { isMobileDevice } from '@/utils/deviceDetection';

const isMobile = isMobileDevice();
</script>

<template>
  <div class="upload-page">
    <h2>Upload Form</h2>

    <hot-file-input-dropzone
      label="Choose XLS or XLSX file (max 100 MB)"
      :variant="isMobile ? 'compact' : 'traditional'"
      accept=".xls, .xlsx"
      showPreview
      :maxSize="100 * 1000 * 1000"
    ></hot-file-input-dropzone>
  </div>
</template>

<style scoped lang="scss">
.upload-page {
  max-width: 50rem;
  margin: 0 auto;
}
</style>
