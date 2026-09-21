<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import ConfirmDialog from '@/components/ConfirmDialog.vue';
import BuilderCanvas from '@/components/builder/BuilderCanvas.vue';
import { generateForm } from '@/services/llmService';
import { useFormStore } from '@/stores/form';
import { friendlyErrorMessage } from '@/utils/errors';

const store = useFormStore();

const prompt = ref('');
const isGenerating = ref(false);
const errorMessage = ref('');
const confirmReplaceOpen = ref(false);

async function runGeneration() {
  isGenerating.value = true;
  errorMessage.value = '';

  try {
    store.loadDocument(await generateForm(prompt.value.trim()));
  } catch (err) {
    errorMessage.value = friendlyErrorMessage(err);
  } finally {
    isGenerating.value = false;
  }
}

function handleGenerate() {
  if (!prompt.value.trim()) return;

  if (store.document.survey.length > 0) {
    confirmReplaceOpen.value = true;
    return;
  }

  void runGeneration();
}

function onPageHide(): void {
  store.flushDraftSave();
}

onMounted(() => {
  window.addEventListener('pagehide', onPageHide);
});

onUnmounted(() => {
  window.removeEventListener('pagehide', onPageHide);
});
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
        variant="neutral"
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

    <wa-callout v-if="errorMessage" class="error-message" variant="danger" role="alert">
      <wa-icon slot="icon" name="circle-exclamation" aria-hidden="true"></wa-icon>
      <div class="error-message-body">
        <span>{{ errorMessage }}</span>
        <wa-button variant="neutral" size="s" @click="errorMessage = ''">Dismiss</wa-button>
      </div>
    </wa-callout>

    <div class="canvas-wrapper">
      <BuilderCanvas />
    </div>

    <ConfirmDialog
      v-model:open="confirmReplaceOpen"
      label="Replace current form?"
      confirm-label="Generate Anyway"
      @confirm="runGeneration"
    >
      <p>Generating a new form will replace your current form and cannot be undone.</p>
    </ConfirmDialog>
  </div>
</template>

<style scoped lang="scss">
.builder-page {
  max-width: 90rem;
  margin: 0 auto;

  @include bp(md) {
    padding: $spacing-lg;
  }
}

.builder-header {
  margin-bottom: $spacing-lg;

  h2 {
    margin-bottom: $spacing-xs;
    color: $color-text-primary;
  }

  .subtitle {
    color: $color-text-primary;
    margin: 0;
  }
}

.prompt-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  margin-bottom: $spacing-lg;

  @include bp(md) {
    flex-direction: row;
    gap: $spacing-md;
  }

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
  margin-bottom: $spacing-lg;
}

.error-message-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-md;
}

.canvas-wrapper {
  height: 85dvh;
  min-height: 28rem;
  border-radius: $border-radius;
  border: 1px solid $color-border;
  overflow: hidden;

  @include bp(lg) {
    height: 70vh;
    min-height: 32rem;
  }
}
</style>
