<script setup lang="ts">
import { computed } from 'vue';

import '@webawesome/badge/badge.js';
import '@webawesome/button/button.js';
import '@webawesome/card/card.js';

const props = defineProps<{
  id: string;
  title: string;
  location: string;
  description: string;
  tags: string[];
  url: string;
  external_link: string;
}>();

const xlsformViewerUrl = computed(() => {
  if (!props.url) return '';
  return `https://xlsform-editor.fmtm.hotosm.org?url=${props.url}`;
});

const isLocalEnvironment =
  import.meta.env.DEV || import.meta.env.VITE_METADATA_URL?.includes('localhost');

const hasExternalLink = computed(() => {
  return props.external_link && props.external_link.trim() !== '';
});

function openForm() {
  if (isLocalEnvironment) {
    alert(
      'This form is stored locally and cannot be opened in the external editor. Use the Download Form button instead or upload to AWS S3 to test this feature.',
    );
    return;
  }
  window.open(xlsformViewerUrl.value, '_blank', 'noopener,noreferrer');
}

function downloadForm() {
  const link = document.createElement('a');
  link.href = props.url;
  link.download = '';
  link.click();
}

function openExternalLink() {
  window.open(props.external_link, '_blank', 'noopener,noreferrer');
}
</script>

<template>
  <wa-card class="record-card">
    <h3 class="mb-0" slot="header">{{ title }}</h3>

    <div class="card-content">
      <div class="card-content-body">
        <p class="description">{{ description }}</p>
      </div>

      <div class="card-footer">
        <p class="location">
          <i>{{ location }}</i>
        </p>
        <div v-if="tags.length > 0" class="tags-section">
          <span class="tags-label">Tags:</span>
          <div class="tags-container">
            <wa-badge v-for="tag in tags" :key="tag" appearance="filled outlined" class="tag-badge">
              {{ tag }}
            </wa-badge>
          </div>
        </div>

        <div class="card-actions">
          <wa-button variant="danger" class="card-actions-button" @click="openForm">
            Open Form
          </wa-button>
          <wa-button variant="neutral" class="card-actions-button" @click="downloadForm">
            Download Form
          </wa-button>
          <wa-button
            v-if="hasExternalLink"
            variant="text"
            class="card-actions-button"
            @click="openExternalLink"
          >
            External Reference
          </wa-button>
        </div>
      </div>
    </div>
  </wa-card>
</template>

<style scoped lang="scss">
.record-card {
  @include card-base();
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-width: 0;
  width: 100%;

  .card-content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    width: 100%;
  }

  .description {
    font-size: $font-size-medium;
    line-height: $line-height-normal;
    color: $color-text-primary;
    margin-bottom: $spacing-sm;
  }

  .card-footer {
    margin-top: $spacing-md;

    .location {
      font-size: $font-size-small;
      color: $color-text-primary;
      opacity: 0.8;
      margin: 0;
    }

    .tags-label {
      font-family: $font-barlow-semibold;
      font-size: $font-size-small;
      color: $color-text-primary;
    }

    .tag-badge {
      margin-right: $spacing-sm;
      border-color: transparent;
      background-color: $color-bg-surface;
      color: $color-text-primary;
      font-size: $font-size-2x-small;
      padding: $spacing-xs $spacing-sm;
      border-radius: $border-radius;
      font-weight: $font-weight-normal;
      opacity: 0.9;
    }

    .card-actions {
      margin-top: $spacing-md;
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: $spacing-sm;

      @include bp(md) {
        flex-direction: row;
        flex-wrap: wrap;
      }

      &-button {
        flex: 1;
        width: 100%;
      }
    }
  }
}
</style>
