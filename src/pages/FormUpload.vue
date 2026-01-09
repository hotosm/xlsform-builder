<script setup lang="ts">
import { reactive } from 'vue';

import '@hotosm/ui/dist/components/file-input-dropzone/file-input-dropzone.js';
import '@webawesome/button/button.js';
import '@webawesome/dialog/dialog.js';
import '@webawesome/icon/icon.js';
import '@webawesome/input/input.js';
import '@webawesome/textarea/textarea.js';

import { fetchMetadata, getPreSignedUrl, uploadJsonToS3, uploadToS3 } from '@/services/s3Upload';
import { isMobileDevice } from '@/utils/deviceDetection';
import { generateFormId, generateUniqueFileName } from '@/utils/fileUtils';

const isMobile = isMobileDevice();

const formData = reactive({
  title: '',
  location: '',
  description: '',
  tags: '',
  external_link: '',
});

const uploadState = reactive({
  selectedFile: null as File | null,
  isSubmitting: false,
  showSuccessDialog: false,
});

function handleFileChange(event: CustomEvent) {
  const files = event.detail?.files;

  if (files && files.length > 0) {
    uploadState.selectedFile = files[0];
  }
}

function parseTags(): string[] {
  return formData.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

async function handleSubmit() {
  if (!uploadState.selectedFile) return;

  uploadState.isSubmitting = true;

  try {
    const uniqueFileName = generateUniqueFileName(formData.title, uploadState.selectedFile.name);

    const formFileResponse = await getPreSignedUrl(uniqueFileName, uploadState.selectedFile.type);

    await uploadToS3(uploadState.selectedFile, formFileResponse.uploadUrl);

    const currentMetadata = await fetchMetadata();

    const tags = parseTags();
    const newForm: FormMetadata = {
      id: generateFormId(),
      title: formData.title.trim(),
      location: formData.location.trim(),
      description: formData.description.trim(),
      tags,
      url: formFileResponse.fileUrl,
      external_link: formData.external_link.trim(),
    };

    const updatedMetadata = {
      forms: [...currentMetadata.forms, newForm],
    };

    const metadataResponse = await getPreSignedUrl('metadata.json', 'application/json');
    await uploadJsonToS3(updatedMetadata, metadataResponse.uploadUrl);

    uploadState.showSuccessDialog = true;
  } catch (error) {
    // TODO: Show error to user in a toast/notification
  } finally {
    uploadState.isSubmitting = false;
  }
}

function resetForm() {
  Object.assign(formData, {
    title: '',
    location: '',
    description: '',
    tags: '',
    external_link: '',
  });
  uploadState.selectedFile = null;
}

function handleDialogClose() {
  uploadState.showSuccessDialog = false;
  resetForm();
}

function handleViewExamples() {
  uploadState.showSuccessDialog = false;
  resetForm();
  window.location.hash = '/';
}
</script>

<template>
  <div class="upload-page">
    <h2>Upload XLSForm</h2>

    <form class="upload-form" @submit.prevent="handleSubmit">
      <div class="form-section">
        <hot-file-input-dropzone
          label="Choose XLS or XLSX file (max 100 MB)"
          :variant="isMobile ? 'compact' : 'traditional'"
          accept=".xls, .xlsx"
          showPreview
          :maxSize="100 * 1000 * 1000"
          @hot-file-change="handleFileChange"
        ></hot-file-input-dropzone>
      </div>

      <div class="form-section">
        <h3>Form Details</h3>

        <wa-input
          v-model="formData.title"
          label="Title"
          placeholder="Enter form title"
          required
          focus
        ></wa-input>

        <wa-input
          v-model="formData.location"
          label="Location"
          placeholder="e.g., Nepal, Kenya, Global"
          required
        ></wa-input>

        <wa-textarea
          v-model="formData.description"
          label="Description"
          placeholder="Describe what this form is used for"
          rows="4"
          required
        ></wa-textarea>

        <wa-input
          v-model="formData.tags"
          label="Tags"
          placeholder="Enter tags separated by commas (e.g., health, survey, mapping)"
          helpText="Separate multiple tags with commas"
        ></wa-input>

        <wa-input
          v-model="formData.external_link"
          label="External Link (Optional)"
          placeholder="https://example.com/reference"
          type="url"
        ></wa-input>
      </div>

      <div class="form-actions">
        <wa-button type="submit" variant="danger" size="medium" :loading="uploadState.isSubmitting">
          Upload Form
        </wa-button>
      </div>
    </form>

    <wa-dialog :open="uploadState.showSuccessDialog" @wa-after-hide="handleDialogClose">
      <div class="success-dialog-content">
        <h2>Your XLSForm has been uploaded successfully!</h2>
      </div>
      <div slot="footer" class="dialog-footer">
        <wa-button variant="neutral" @click="handleDialogClose">Upload Another</wa-button>
        <wa-button variant="danger" @click="handleViewExamples">View Examples</wa-button>
      </div>
    </wa-dialog>
  </div>
</template>

<style scoped lang="scss">
.upload-page {
  max-width: 50rem;
  margin: 0 auto;
  padding: $spacing-lg;

  h2 {
    margin-bottom: $spacing-lg;
    color: $color-text-primary;
  }
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  h3 {
    margin: 0 0 $spacing-sm 0;
    color: $color-text-primary;
    font-size: $font-size-large;
    font-family: $font-barlow-semibold;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: $spacing-md;
}

.success-dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: $spacing-md;

  p {
    margin: 0;
    color: $color-text-primary;
  }
}

.dialog-footer {
  display: flex;
  gap: $spacing-md;
  justify-content: center;
  width: 100%;
}
</style>
