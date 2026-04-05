<script setup lang="ts">
import { ref } from 'vue';

import '@webawesome/button/button.js';
import '@webawesome/input/input.js';
import '@webawesome/spinner/spinner.js';

import FormPreview from '@/components/FormPreview.vue';
import { generateForm } from '@/services/llmService';
import { exportToXlsx } from '@/utils/export';
import type { XLSFormDocument } from '@/types/xlsform';

const prompt = ref('');
const isGenerating = ref(false);
const errorMessage = ref('');
const generatedDoc = ref<XLSFormDocument | null>(null);

async function handleGenerate() {
  if (!prompt.value.trim()) return;

  isGenerating.value = true;
  errorMessage.value = '';

  try {
    generatedDoc.value = await generateForm(prompt.value.trim());
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Generation failed';
  } finally {
    isGenerating.value = false;
  }
}

function handleDownload() {
  if (!generatedDoc.value) return;

  const data = exportToXlsx(generatedDoc.value);
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${generatedDoc.value.settings.formId || 'form'}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="builder-page">
    <div class="builder-header">
      <h2>AI Form Builder</h2>
      <p class="subtitle">
        Describe the survey you need in plain language and get a ready-to-use XLSForm.
      </p>
    </div>

    <form class="prompt-form" @submit.prevent="handleGenerate">
      <wa-input
        v-model="prompt"
        placeholder="e.g., I want to survey building damage after an earthquake"
        :disabled="isGenerating"
      ></wa-input>
      <wa-button
        type="submit"
        variant="danger"
        :disabled="!prompt.trim() || isGenerating"
        :loading="isGenerating"
      >
        Generate Form
      </wa-button>
    </form>

    <div v-if="isGenerating" class="loading-state">
      <wa-spinner></wa-spinner>
      <div class="loading-text">
        <p>Generating your form...</p>
        <p class="loading-hint">This may take a few moments depending on the form complexity.</p>
      </div>
    </div>

    <div v-if="errorMessage" class="error-message">
      <p>{{ errorMessage }}</p>
      <wa-button variant="neutral" size="small" @click="errorMessage = ''">Dismiss</wa-button>
    </div>

    <div v-if="generatedDoc && !isGenerating" class="result-card">
      <div class="result-header">
        <h3>{{ generatedDoc.settings.formTitle }}</h3>
        <wa-button variant="danger" size="small" @click="handleDownload">
          Download .xlsx
        </wa-button>
      </div>
      <FormPreview :document="generatedDoc" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.builder-page {
  max-width: 50rem;
  margin: 0 auto;
  padding: $spacing-lg;
}

.builder-header {
  margin-bottom: $spacing-lg;

  h2 {
    margin-bottom: $spacing-xs;
    color: $color-text-primary;
  }

  .subtitle {
    color: $color-text-primary;
    opacity: 0.7;
    margin: 0;
  }
}

.prompt-form {
  display: flex;
  gap: $spacing-md;
  margin-bottom: $spacing-lg;

  wa-input {
    flex: 1;
  }
}

.loading-state {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-lg;
  justify-content: center;

  .loading-text {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
  }

  p {
    margin: 0;
    color: $color-text-primary;
    opacity: 0.7;

    &.loading-hint {
      font-size: 0.875rem;
    }
  }
}

.error-message {
  background: rgba(212, 42, 56, 0.1);
  border: 1px solid #d42a38;
  border-radius: $border-radius;
  padding: $spacing-md;
  margin-bottom: $spacing-lg;
  display: flex;
  align-items: center;
  justify-content: space-between;

  p {
    margin: 0;
    color: #d42a38;
  }
}

.result-card {
  background: $color-bg-surface;
  border-radius: $border-radius;
  padding: $spacing-lg;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-lg;

  h3 {
    margin: 0;
    color: $color-text-primary;
  }
}
</style>
