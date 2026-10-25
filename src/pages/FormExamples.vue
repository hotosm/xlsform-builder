<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { PAGE_SIZE, buildSearchHash, filterForms, readSearchParams } from '@/utils/formFilter';
import { getRuntimeConfig } from '@/utils/runtimeConfig';

import FormRecord from '../components/FormRecord.vue';

const forms = ref<FormMetadata[]>([]);
const loading = ref(true);
const formsUrl = getRuntimeConfig(
  'VITE_METADATA_URL',
  'https://xlsforms.s3.amazonaws.com/metadata.json'
);

// Search state lives in the URL hash (e.g. `#/?q=water&tag=wash`) so filtered views can be shared
const initialSearch = readSearchParams(window.location.hash);
const searchQuery = ref(initialSearch.query);
const activeTag = ref(initialSearch.tag);
const visibleCount = ref(PAGE_SIZE);

const filteredForms = computed(() => filterForms(forms.value, searchQuery.value, activeTag.value));
const visibleForms = computed(() => filteredForms.value.slice(0, visibleCount.value));
const hasMore = computed(() => filteredForms.value.length > visibleCount.value);
const isFiltering = computed(() => searchQuery.value.trim() !== '' || activeTag.value !== '');

watch([searchQuery, activeTag], ([query, tag]) => {
  visibleCount.value = PAGE_SIZE;
  const hash = buildSearchHash('/', query, tag);
  if (hash !== window.location.hash) {
    // replaceState does not fire hashchange, so routing is unaffected
    history.replaceState(null, '', hash);
  }
});

function syncFromHash() {
  const { query, tag } = readSearchParams(window.location.hash);
  searchQuery.value = query;
  activeTag.value = tag;
}

onMounted(async () => {
  window.addEventListener('hashchange', syncFromHash);
  try {
    const cacheBustUrl = `${formsUrl}?t=${Date.now()}`;
    const res = await fetch(cacheBustUrl, { cache: 'no-store' });
    const json = await res.json();
    forms.value = json.forms;
  } catch (e) {
    console.error('Failed to fetch forms:', e);
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncFromHash);
});

function onSearchInput(event: Event) {
  searchQuery.value = (event.target as HTMLInputElement).value ?? '';
}

function toggleTag(tag: string) {
  activeTag.value = activeTag.value.toLowerCase() === tag.toLowerCase() ? '' : tag;
}

function clearFilters() {
  searchQuery.value = '';
  activeTag.value = '';
}

function showMore() {
  visibleCount.value += PAGE_SIZE;
}

function goToUpload() {
  window.location.hash = '/upload';
}
</script>

<template>
  <div>
    <div v-if="loading" class="loading-state">
      <wa-spinner></wa-spinner>
    </div>

    <div v-else-if="forms.length === 0" class="empty-state">
      <div class="empty-state-content">
        <h3>No Forms Yet</h3>
        <p>Upload your first XLSForm to get started</p>
        <wa-button variant="danger" @click="goToUpload">Upload Form</wa-button>
      </div>
    </div>

    <div v-else class="examples-content">
      <h2>Example Forms</h2>

      <div class="search-bar">
        <wa-input
          type="search"
          :value="searchQuery"
          label="Search forms"
          placeholder="Search by title, location, description or tag"
          with-clear
          @input="onSearchInput"
          @wa-clear="searchQuery = ''"
        >
          <wa-icon slot="start" name="magnifying-glass"></wa-icon>
        </wa-input>
      </div>

      <div class="results-summary" aria-live="polite">
        <span>
          Showing {{ visibleForms.length }} of {{ filteredForms.length }}
          {{ filteredForms.length === 1 ? 'form' : 'forms' }}
          <template v-if="activeTag">
            tagged
            <wa-tag size="small" with-remove @wa-remove="activeTag = ''">{{ activeTag }}</wa-tag>
          </template>
        </span>
        <wa-button
          v-if="isFiltering"
          variant="neutral"
          appearance="plain"
          size="small"
          @click="clearFilters"
        >
          Clear filters
        </wa-button>
      </div>

      <div v-if="filteredForms.length === 0" class="no-results">
        <p>No forms match your search.</p>
        <wa-button variant="neutral" @click="clearFilters">Clear filters</wa-button>
      </div>

      <div class="forms-container">
        <FormRecord
          v-for="form in visibleForms"
          :key="form.id"
          :id="form.id"
          :title="form.title"
          :location="form.location"
          :description="form.description"
          :tags="form.tags"
          :url="form.url"
          :external_link="form.external_link"
          :active-tag="activeTag"
          @tag-click="toggleTag"
        />
      </div>

      <div v-if="hasMore" class="show-more">
        <wa-button variant="neutral" @click="showMore">Show more</wa-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);

  wa-spinner {
    font-size: 3rem;
    --indicator-color: $color-primary;
  }
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 200px);
  padding: $spacing-xl;

  .empty-state-content {
    text-align: center;
    max-width: 25rem;
  }
}

.examples-content {
  max-width: 50rem;
  margin: 0 auto;
  padding: $spacing-lg;

  h2 {
    margin-bottom: $spacing-lg;
    color: $color-text-primary;
  }
}

.search-bar {
  margin-bottom: $spacing-md;
}

.results-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  font-size: $font-size-small;
  color: $color-text-primary;
}

.no-results {
  text-align: center;
  padding: $spacing-xl 0;
  color: $color-text-primary;
}

.show-more {
  display: flex;
  justify-content: center;
  margin-top: $spacing-lg;
}

.forms-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: $spacing-md;
  align-items: stretch;

  @include bp(md) {
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: $spacing-lg;
  }
}
</style>
