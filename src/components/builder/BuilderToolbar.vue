<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { useBuilderUiStore } from '@/stores/builderUi';
import { useFormStore } from '@/stores/form';
import { friendlyErrorMessage } from '@/utils/errors';
import { exportToXlsx } from '@/utils/export';
import { type FormIssue, findFormIssues } from '@/utils/formIssues';
import { collectNames } from '@/utils/tree';

import { findNodeElement } from './domSelectors';
import { WIDE_LAYOUT_QUERY, useMediaQuery } from './useMediaQuery';

defineProps<{ showAddQuestion?: boolean }>();
const emit = defineEmits<{ addQuestion: [] }>();

const store = useFormStore();
const ui = useBuilderUiStore();
const showLabels = useMediaQuery(WIDE_LAYOUT_QUERY);
const iconOnly = computed(() => !showLabels.value);

const isExporting = ref(false);
const exportError = ref('');
const confirmClearOpen = ref(false);
const showIssues = ref(false);

const issues = computed(() => findFormIssues(store.document));

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

function handleExport(): void {
  if (issues.value.length > 0) {
    showIssues.value = true;
    return;
  }
  void runExport();
}

function exportAnyway(): void {
  showIssues.value = false;
  void runExport();
}

function goToIssue(issue: FormIssue): void {
  store.selectNode(issue.nodeId);
  ui.requestInspector(issue.nodeId, true);
  findNodeElement(issue.nodeId)?.scrollIntoView({ block: 'nearest' });
}

async function runExport(): Promise<void> {
  if (isExporting.value) return;
  showIssues.value = false;
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
      v-if="showLabels"
      variant="neutral"
      size="s"
      :class="{ pressed: !ui.isCollapsed('palette') }"
      @click="ui.setCollapsed('palette', !ui.isCollapsed('palette'))"
    >
      <wa-icon slot="start" name="square-plus" aria-hidden="true"></wa-icon>
      Question types
      <span class="sr-only">{{ ui.isCollapsed('palette') ? '(hidden)' : '(shown)' }}</span>
    </wa-button>
    <wa-button
      v-if="showAddQuestion"
      variant="neutral"
      size="s"
      title="Add question"
      @click="emit('addQuestion')"
    >
      <wa-icon v-if="iconOnly" name="plus" label="Add question"></wa-icon>
      <template v-else>
        <wa-icon slot="start" name="plus" aria-hidden="true"></wa-icon>
        Add question
      </template>
    </wa-button>
    <wa-button
      variant="neutral"
      size="s"
      :disabled="!store.canUndo"
      title="Undo (Ctrl/Cmd+Z)"
      @click="store.undo()"
    >
      <wa-icon v-if="iconOnly" name="arrow-rotate-left" label="Undo"></wa-icon>
      <template v-else>
        <wa-icon slot="start" name="arrow-rotate-left" aria-hidden="true"></wa-icon>
        Undo
      </template>
    </wa-button>
    <wa-button
      variant="neutral"
      size="s"
      :disabled="!store.canRedo"
      title="Redo (Ctrl/Cmd+Shift+Z)"
      @click="store.redo()"
    >
      <wa-icon v-if="iconOnly" name="arrow-rotate-right" label="Redo"></wa-icon>
      <template v-else>
        <wa-icon slot="start" name="arrow-rotate-right" aria-hidden="true"></wa-icon>
        Redo
      </template>
    </wa-button>
    <wa-button
      appearance="plain"
      variant="neutral"
      size="s"
      :disabled="questionCount === 0"
      @click="confirmClearOpen = true"
    >
      <wa-icon v-if="iconOnly" name="trash" label="Clear form"></wa-icon>
      <template v-else>
        <wa-icon slot="start" name="trash" aria-hidden="true"></wa-icon>
        Clear form
      </template>
    </wa-button>
    <span
      v-if="store.draftSaveFailed"
      class="draft-saved draft-save-failed"
      role="status"
      title="Changes can't be saved in this browser. Export to keep a copy."
    >
      <wa-icon name="triangle-exclamation" aria-hidden="true"></wa-icon>
      Not saved: browser storage unavailable
    </span>
    <span v-else-if="savedAtLabel" class="draft-saved">{{ savedAtLabel }}</span>
    <wa-button
      variant="danger"
      size="s"
      class="export-button"
      :disabled="questionCount === 0"
      :title="questionCount === 0 ? 'Add a question to export' : undefined"
      :loading="isExporting"
      @click="handleExport"
    >
      Export
    </wa-button>
    <wa-button
      v-if="showLabels"
      variant="neutral"
      size="s"
      :class="{ pressed: !ui.isCollapsed('inspector') }"
      @click="ui.setCollapsed('inspector', !ui.isCollapsed('inspector'))"
    >
      <wa-icon slot="start" name="sliders" aria-hidden="true"></wa-icon>
      Properties
      <span class="sr-only">{{ ui.isCollapsed('inspector') ? '(hidden)' : '(shown)' }}</span>
    </wa-button>
    <wa-callout
      v-if="showIssues && issues.length > 0"
      class="export-issues"
      variant="warning"
      size="s"
      role="alert"
    >
      <wa-icon slot="icon" name="triangle-exclamation" aria-hidden="true"></wa-icon>
      <div class="export-issues-body">
        <p class="export-issues-title">
          {{ issues.length }} problem{{ issues.length === 1 ? '' : 's' }} may stop this form from
          working in ODK or KoboToolbox.
        </p>
        <div class="export-issues-list">
          <wa-button
            v-for="(issue, i) in issues"
            :key="`${issue.nodeId}-${i}`"
            class="export-issue"
            appearance="plain"
            variant="neutral"
            size="s"
            @click="goToIssue(issue)"
          >
            <span class="export-issue-label">{{ issue.nodeLabel }}</span>
            {{ issue.message }}
          </wa-button>
        </div>
        <div class="export-issues-actions">
          <wa-button appearance="outlined" size="s" @click="exportAnyway">Export anyway</wa-button>
          <wa-button appearance="plain" size="s" @click="showIssues = false">Dismiss</wa-button>
        </div>
      </div>
    </wa-callout>
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

.pressed::part(button) {
  border-color: $color-neutral-700;
  background: $color-bg-card;
  box-shadow: inset 0 0 0 1px $color-neutral-700;
}

.export-button {
  margin-left: auto;
}

.draft-saved {
  color: $color-text-secondary;
  font-size: $font-size-small;
}

.draft-save-failed {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  color: var(--wa-color-warning-on-quiet);
  font-weight: $font-weight-semibold;
}

.export-error,
.export-issues {
  flex-basis: 100%;
}

.export-issues-body {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  font-size: $font-size-small;
}

.export-issues-title {
  margin: 0;
  font-weight: $font-weight-semibold;
}

.export-issues-list {
  display: flex;
  flex-direction: column;
  max-height: 8rem;
  overflow-y: auto;
}

.export-issue::part(button) {
  justify-content: flex-start;
  height: auto;
  padding: $spacing-xs 0;
  white-space: normal;
  text-align: left;
}

.export-issue-label {
  font-weight: $font-weight-semibold;
  text-decoration: underline;

  &::after {
    content: ':';
  }
}

.export-issues-actions {
  display: flex;
  gap: $spacing-sm;
}

.export-error-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  font-size: $font-size-small;
}
</style>
