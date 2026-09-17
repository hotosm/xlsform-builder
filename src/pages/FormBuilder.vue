<script setup lang="ts">
import { ref } from 'vue';

import BuilderCanvas from '@/components/builder/BuilderCanvas.vue';
import { generateForm } from '@/services/llmService';
import { useFormStore } from '@/stores/form';

const store = useFormStore();

const prompt = ref('');
const isGenerating = ref(false);
const errorMessage = ref('');

async function handleGenerate() {
  if (!prompt.value.trim()) return;

  isGenerating.value = true;
  errorMessage.value = '';

  try {
    store.loadDocument(await generateForm(prompt.value.trim()));
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Generation failed';
  } finally {
    isGenerating.value = false;
  }
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
      <wa-button variant="neutral" size="s" @click="errorMessage = ''">Dismiss</wa-button>
    </div>

    <div class="canvas-wrapper">
      <BuilderCanvas />
    </div>
  </div>
</template>

<style scoped lang="scss">
.builder-page {
  max-width: 90rem;
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

.canvas-wrapper {
  min-height: 32rem;
  border-radius: $border-radius;
  border: 1px solid $color-border;
  overflow: hidden;
}
</style>
