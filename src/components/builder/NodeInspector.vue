<script setup lang="ts">
import { type Ref, computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';

import { PALETTE_LABELS } from '@/constants/paletteItems';
import { useFormStore } from '@/stores/form';
import type { ChoiceList, SurveyNode } from '@/types/xlsform';
import { localizedText } from '@/utils/localized';
import { collectNames, countListUsages, findNode } from '@/utils/tree';

withDefaults(defineProps<{ closable?: boolean }>(), { closable: false });
const emit = defineEmits<{ close: []; escape: [] }>();

const store = useFormStore();

const node = computed(() =>
  store.selectedNodeId ? findNode(store.document.survey, store.selectedNodeId) : null,
);

const nodeType = computed(() => node.value?.type ?? '');
const typeLabel = computed(() =>
  node.value ? (PALETTE_LABELS[node.value.type] ?? node.value.type) : '',
);
const headingText = computed(() =>
  node.value ? localizedText(node.value.label, node.value.name) : '',
);

const isSelectType = computed(
  () => nodeType.value === 'select_one' || nodeType.value === 'select_multiple',
);
const isCalculate = computed(() => nodeType.value === 'calculate');
const isRepeat = computed(() => nodeType.value === 'repeat');

const NO_VALUE_TYPES = new Set(['group', 'repeat', 'note', 'calculate', 'acknowledge']);
const NO_REQUIRED_TYPES = new Set(['group', 'repeat', 'note', 'calculate']);
const NO_READONLY_TYPES = new Set(['note', 'calculate']);
const supportsValueFields = computed(() => !NO_VALUE_TYPES.has(nodeType.value));
const supportsRequired = computed(() => !NO_REQUIRED_TYPES.has(nodeType.value));
const supportsReadonly = computed(() => !NO_READONLY_TYPES.has(nodeType.value));
const supportsHint = computed(() => !isCalculate.value);
const supportsAppearance = computed(() => !isCalculate.value);

const NEW_LIST_OPTION = '__new__';

const name = ref('');
const nameError = ref('');
const label = ref('');
const hint = ref('');
const required = ref(false);
const relevant = ref('');
const calculation = ref('');
const appearance = ref('');
const constraint = ref('');
const constraintMessage = ref('');
const defaultValue = ref('');
const readonly = ref(false);
const repeatCount = ref('');
const choiceFilter = ref('');
const listNameDraft = ref('');

interface ChoiceDraft {
  id: string;
  originalName: string;
  name: string;
  label: string;
}

const choiceDrafts = ref<ChoiceDraft[]>([]);

const FIELDS: [Ref<string> | Ref<boolean>, (n: SurveyNode) => string | boolean][] = [
  [name, (n) => n.name],
  [label, (n) => localizedText(n.label, n.name)],
  [hint, (n) => (n.hint ? localizedText(n.hint) : '')],
  [required, (n) => n.required === 'true'],
  [relevant, (n) => n.relevant ?? ''],
  [calculation, (n) => n.calculation ?? ''],
  [appearance, (n) => n.appearance ?? ''],
  [constraint, (n) => n.constraint ?? ''],
  [constraintMessage, (n) => (n.constraintMessage ? localizedText(n.constraintMessage) : '')],
  [defaultValue, (n) => n.default ?? ''],
  [readonly, (n) => n.readonly === 'true'],
  [repeatCount, (n) => n.repeatCount ?? ''],
  [choiceFilter, (n) => n.choiceFilter ?? ''],
  [listNameDraft, (n) => n.listName ?? ''],
];

function seedFromNode(n: SurveyNode | null): void {
  if (!n) return;
  nameError.value = '';
  for (const [field, read] of FIELDS) field.value = read(n);
}

function syncChangedFields(n: SurveyNode | null, previous: SurveyNode | null): void {
  if (!n || !previous || n.id !== previous.id) return;
  if (n.name !== previous.name) nameError.value = '';
  for (const [field, read] of FIELDS) {
    const value = read(n);
    if (value !== read(previous)) field.value = value;
  }
}

const currentList = computed(() => {
  const listName = node.value?.listName;
  return listName ? store.document.choices.find((c) => c.listName === listName) : undefined;
});

function seedChoices(list: ChoiceList | undefined): void {
  // Reuse row ids across reseeds so v-for keeps each wa-input bound to its choice.
  const previousIds = new Map<string, string[]>();
  for (const d of choiceDrafts.value) {
    previousIds.set(d.originalName, [...(previousIds.get(d.originalName) ?? []), d.id]);
  }
  choiceDrafts.value = (list?.choices ?? []).map((c) => ({
    id: previousIds.get(c.name)?.shift() ?? crypto.randomUUID(),
    originalName: c.name,
    name: c.name,
    label: localizedText(c.label, c.name),
  }));
}

const availableLists = computed(() => store.document.choices.map((c) => c.listName));

const listUsageCount = computed(() => {
  if (!node.value?.listName) return 0;
  return Math.max(0, countListUsages(store.document.survey, node.value.listName) - 1);
});

watch(
  () => node.value?.id,
  () => seedFromNode(node.value),
  { immediate: true },
);
watch(node, syncChangedFields);
watch(currentList, seedChoices, { immediate: true });

// --- ${name} reference checking:

const REF_PATTERN = /\$\{([^}]+)\}/g;

const knownNames = computed(() => new Set(collectNames(store.document.survey)));

function unknownRefs(expression: string): string[] {
  const missing = new Set<string>();
  for (const match of expression.matchAll(REF_PATTERN)) {
    const ref = match[1].trim();
    if (!knownNames.value.has(ref)) missing.add(ref);
  }
  return [...missing];
}

function unknownRefsMessage(expression: string): string {
  const missing = unknownRefs(expression);
  if (missing.length === 0) return '';
  const list = missing.map((m) => `\${${m}}`).join(', ');
  return `No question named ${list}.`;
}

const calculationWarning = computed(() => unknownRefsMessage(calculation.value));
const relevantWarning = computed(() => unknownRefsMessage(relevant.value));
const repeatCountWarning = computed(() => unknownRefsMessage(repeatCount.value));
const constraintWarning = computed(() => unknownRefsMessage(constraint.value));
const choiceFilterWarning = computed(() => unknownRefsMessage(choiceFilter.value));

const HINTS = {
  calculation: 'Expression whose result is stored, e.g. ${price} * ${quantity}',
  relevant: "Leave empty to always show. XLSForm “relevant”, e.g. ${has_damage} = 'yes'",
  repeatCount: 'Leave empty to let respondents add as many as needed, e.g. ${household_size}',
  constraint: 'XLSForm “constraint”. Use . for this answer, e.g. . >= 0 and . <= 100',
  name: 'Unique ID used in exported data and in ${…} references.',
  choiceFilter: 'XLSForm “choice_filter”, e.g. state = ${state}',
};

// --- Sections:

type SectionId = 'question' | 'choices' | 'logic' | 'validation' | 'advanced';

const SECTIONS_STORAGE_KEY = 'xlsform-builder.inspector-sections';
const DEFAULT_EXPANDED: SectionId[] = ['question', 'choices'];

function loadExpanded(): Set<SectionId> {
  try {
    const raw = localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as SectionId[]);
  } catch {
    // Storage blocked or corrupt, fall back to defaults.
  }
  return new Set(DEFAULT_EXPANDED);
}

const expandedSections = ref(loadExpanded());

function setExpanded(id: SectionId, open: boolean): void {
  if (open) expandedSections.value.add(id);
  else expandedSections.value.delete(id);
  try {
    localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify([...expandedSections.value]));
  } catch {
    // Remembering open sections is a convenience, ignore storage failures.
  }
}

function countFilled(values: (string | boolean)[]): number {
  return values.filter((v) => (typeof v === 'string' ? v.trim() !== '' : v)).length;
}

const logicCount = computed(() =>
  countFilled([relevant.value, isRepeat.value ? repeatCount.value : '']),
);
const validationCount = computed(() => countFilled([constraint.value, constraintMessage.value]));
const advancedCount = computed(() =>
  countFilled([
    supportsAppearance.value ? appearance.value : '',
    supportsValueFields.value ? defaultValue.value : '',
    isSelectType.value ? choiceFilter.value : '',
    supportsReadonly.value ? readonly.value : false,
  ]),
);

// --- Focus handoff:

const labelInput = useTemplateRef<HTMLElement>('labelInput');
const calculationInput = useTemplateRef<HTMLElement>('calculationInput');

function focusFirstField(): void {
  (isCalculate.value ? calculationInput.value : labelInput.value)?.focus();
}

defineExpose({ focusFirstField });

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const inOpenSelect = event
    .composedPath()
    .some(
      (el) => el instanceof HTMLElement && el.tagName === 'WA-SELECT' && el.hasAttribute('open'),
    );
  if (inOpenSelect) return;
  emit('escape');
}

// --- Commits:

function commitName(): void {
  if (!node.value) return;
  const trimmed = name.value.trim();
  if (!trimmed) {
    nameError.value = 'Name is required.';
    name.value = node.value.name;
    return;
  }
  const existingNames = collectNames(store.document.survey, node.value.id);
  if (existingNames.includes(trimmed)) {
    nameError.value = 'Another question already uses this name.';
    name.value = node.value.name;
    return;
  }
  nameError.value = '';
  store.updateNode(node.value.id, { name: trimmed });
}

let labelBatchOpen = false;

function beginLabelEdit(): void {
  if (labelBatchOpen) return;
  labelBatchOpen = true;
  store.beginHistoryBatch();
}

function endLabelEdit(): void {
  if (!labelBatchOpen) return;
  labelBatchOpen = false;
  store.endHistoryBatch();
}

function onLabelInput(): void {
  if (!node.value) return;
  store.updateNode(node.value.id, { label: label.value });
}

watch(() => node.value?.id, endLabelEdit);
onBeforeUnmount(endLabelEdit);

function commitHint(): void {
  if (!node.value) return;
  store.updateNode(node.value.id, { hint: hint.value.trim() || undefined });
}

function commitRequired(): void {
  if (!node.value) return;
  store.updateNode(node.value.id, { required: required.value ? 'true' : undefined });
}

function commitRelevant(): void {
  if (!node.value) return;
  store.updateNode(node.value.id, { relevant: relevant.value.trim() || undefined });
}

function commitCalculation(): void {
  if (!node.value) return;
  store.updateNode(node.value.id, { calculation: calculation.value.trim() || undefined });
}

function commitAppearance(): void {
  if (!node.value) return;
  store.updateNode(node.value.id, { appearance: appearance.value.trim() || undefined });
}

function commitConstraint(): void {
  if (!node.value) return;
  store.updateNode(node.value.id, { constraint: constraint.value.trim() || undefined });
}

function commitConstraintMessage(): void {
  if (!node.value) return;
  store.updateNode(node.value.id, {
    constraintMessage: constraintMessage.value.trim() || undefined,
  });
}

function commitDefault(): void {
  if (!node.value) return;
  store.updateNode(node.value.id, { default: defaultValue.value.trim() || undefined });
}

function commitReadonly(): void {
  if (!node.value) return;
  store.updateNode(node.value.id, { readonly: readonly.value ? 'true' : undefined });
}

function commitRepeatCount(): void {
  if (!node.value) return;
  store.updateNode(node.value.id, { repeatCount: repeatCount.value.trim() || undefined });
}

function commitChoiceFilter(): void {
  if (!node.value) return;
  store.updateNode(node.value.id, { choiceFilter: choiceFilter.value.trim() || undefined });
}

function uniqueListName(base: string): string {
  const existing = new Set(store.document.choices.map((l) => l.listName));
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

function commitListName(): void {
  if (!node.value) return;
  if (listNameDraft.value === NEW_LIST_OPTION) {
    const newName = uniqueListName(`${node.value.name}_choices`);
    store.addChoiceList(newName);
    store.updateNode(node.value.id, { listName: newName });
  } else if (listNameDraft.value && listNameDraft.value !== node.value.listName) {
    store.updateNode(node.value.id, { listName: listNameDraft.value });
  }
  listNameDraft.value = node.value.listName ?? '';
}

function commitChoice(draft: ChoiceDraft): void {
  if (!node.value?.listName) return;
  store.updateChoice(node.value.listName, draft.originalName, {
    name: draft.name.trim() || draft.originalName,
    label: draft.label,
  });
  draft.originalName = draft.name.trim() || draft.originalName;
}

function addChoice(): void {
  if (!node.value?.listName) return;
  store.addChoice(node.value.listName);
}

function removeChoice(draft: ChoiceDraft): void {
  if (!node.value?.listName) return;
  store.removeChoice(node.value.listName, draft.originalName);
}
</script>

<template>
  <aside class="node-inspector" aria-label="Question properties" @keydown="onKeydown">
    <header class="inspector-header">
      <template v-if="node">
        <div class="inspector-title">
          <wa-badge appearance="outlined" variant="neutral">{{ typeLabel }}</wa-badge>
          <h3 class="inspector-heading">{{ headingText }}</h3>
          <code class="inspector-name">{{ node.name }}</code>
        </div>
      </template>
      <h3 v-else class="inspector-heading">Question properties</h3>
      <wa-button v-if="closable" appearance="plain" size="s" @click="emit('close')">
        <wa-icon name="xmark" label="Close"></wa-icon>
      </wa-button>
    </header>

    <div v-if="!node" class="inspector-empty">
      <wa-icon class="inspector-empty-icon" name="arrow-pointer" aria-hidden="true"></wa-icon>
      <p>Select a question in the canvas to edit its properties.</p>
    </div>

    <wa-accordion
      v-else
      class="inspector-sections"
      mode="multiple"
      appearance="plain"
      heading-level="4"
    >
      <wa-accordion-item
        :expanded="expandedSections.has('question')"
        @wa-accordion-item-expanded="setExpanded('question', true)"
        @wa-accordion-item-collapsed="setExpanded('question', false)"
      >
        <span slot="label" class="section-label">
          {{ isCalculate ? 'Calculation' : 'Question' }}
        </span>
        <div class="section-fields">
          <wa-textarea
            v-if="isCalculate"
            ref="calculationInput"
            v-model="calculation"
            label="Calculation"
            resize="auto"
            rows="1"
            @change="commitCalculation"
          >
            <span slot="hint" :class="{ 'field-warning': calculationWarning }">
              {{ calculationWarning || HINTS.calculation }}
            </span>
          </wa-textarea>
          <wa-input
            ref="labelInput"
            v-model="label"
            label="Label"
            :hint="isCalculate ? 'Not shown to respondents.' : 'What respondents see.'"
            @focus="beginLabelEdit"
            @blur="endLabelEdit"
            @input="onLabelInput"
          ></wa-input>
          <wa-input
            v-if="supportsHint"
            v-model="hint"
            label="Hint"
            hint="Extra guidance shown under the question."
            @change="commitHint"
          ></wa-input>
          <wa-checkbox
            v-if="supportsRequired"
            :checked="required"
            hint="Respondents can't continue without answering."
            @change="
              required = ($event.target as HTMLInputElement).checked;
              commitRequired();
            "
          >
            Required
          </wa-checkbox>
        </div>
      </wa-accordion-item>

      <wa-accordion-item
        v-if="isSelectType"
        :expanded="expandedSections.has('choices')"
        @wa-accordion-item-expanded="setExpanded('choices', true)"
        @wa-accordion-item-collapsed="setExpanded('choices', false)"
      >
        <span slot="label" class="section-label">
          Choices
          <wa-badge appearance="filled" variant="neutral" pill>{{ choiceDrafts.length }}</wa-badge>
        </span>
        <div class="section-fields">
          <wa-select v-model="listNameDraft" label="Choice list" size="s" @change="commitListName">
            <wa-option v-for="listName in availableLists" :key="listName" :value="listName">
              {{ listName }}
            </wa-option>
            <wa-divider></wa-divider>
            <wa-option :value="NEW_LIST_OPTION">
              <wa-icon slot="start" name="plus" aria-hidden="true"></wa-icon>
              Create new list
            </wa-option>
            <span v-if="listUsageCount > 0" slot="hint">
              Shared with {{ listUsageCount }} other question{{ listUsageCount === 1 ? '' : 's' }} —
              edits apply to all.
            </span>
          </wa-select>

          <div v-if="choiceDrafts.length > 0" class="choice-table">
            <div class="choice-row choice-header" aria-hidden="true">
              <span>Label shown</span>
              <span>Saved value</span>
              <span></span>
            </div>
            <div v-for="(draft, i) in choiceDrafts" :key="draft.id" class="choice-row">
              <wa-input
                v-model="draft.label"
                size="s"
                :aria-label="`Choice ${i + 1} label`"
                @change="commitChoice(draft)"
              ></wa-input>
              <wa-input
                v-model="draft.name"
                size="s"
                :aria-label="`Choice ${i + 1} saved value`"
                @change="commitChoice(draft)"
              ></wa-input>
              <wa-button
                appearance="plain"
                size="s"
                title="Remove choice"
                @click="removeChoice(draft)"
              >
                <wa-icon
                  name="xmark"
                  :label="`Remove choice ${draft.label || draft.name}`"
                ></wa-icon>
              </wa-button>
            </div>
          </div>
          <wa-button class="add-choice" appearance="outlined" size="s" @click="addChoice">
            <wa-icon slot="start" name="plus" aria-hidden="true"></wa-icon>
            Add choice
          </wa-button>
        </div>
      </wa-accordion-item>

      <wa-accordion-item
        :expanded="expandedSections.has('logic')"
        @wa-accordion-item-expanded="setExpanded('logic', true)"
        @wa-accordion-item-collapsed="setExpanded('logic', false)"
      >
        <span slot="label" class="section-label">
          Logic
          <wa-badge v-if="logicCount > 0" appearance="filled" variant="brand" pill>
            {{ logicCount }}
          </wa-badge>
        </span>
        <div class="section-fields">
          <wa-textarea
            v-model="relevant"
            label="Only show if…"
            resize="auto"
            rows="1"
            @change="commitRelevant"
          >
            <span slot="hint" :class="{ 'field-warning': relevantWarning }">
              {{ relevantWarning || HINTS.relevant }}
            </span>
          </wa-textarea>
          <wa-textarea
            v-if="isRepeat"
            v-model="repeatCount"
            label="Number of repeats"
            resize="auto"
            rows="1"
            @change="commitRepeatCount"
          >
            <span slot="hint" :class="{ 'field-warning': repeatCountWarning }">
              {{ repeatCountWarning || HINTS.repeatCount }}
            </span>
          </wa-textarea>
        </div>
      </wa-accordion-item>

      <wa-accordion-item
        v-if="supportsValueFields"
        :expanded="expandedSections.has('validation')"
        @wa-accordion-item-expanded="setExpanded('validation', true)"
        @wa-accordion-item-collapsed="setExpanded('validation', false)"
      >
        <span slot="label" class="section-label">
          Validation
          <wa-badge v-if="validationCount > 0" appearance="filled" variant="brand" pill>
            {{ validationCount }}
          </wa-badge>
        </span>
        <div class="section-fields">
          <wa-textarea
            v-model="constraint"
            label="Valid answers"
            resize="auto"
            rows="1"
            @change="commitConstraint"
          >
            <span slot="hint" :class="{ 'field-warning': constraintWarning }">
              {{ constraintWarning || HINTS.constraint }}
            </span>
          </wa-textarea>
          <wa-input
            v-model="constraintMessage"
            label="Message when invalid"
            hint="Shown to respondents when the answer fails the rule above."
            @change="commitConstraintMessage"
          ></wa-input>
        </div>
      </wa-accordion-item>

      <wa-accordion-item
        :expanded="expandedSections.has('advanced')"
        @wa-accordion-item-expanded="setExpanded('advanced', true)"
        @wa-accordion-item-collapsed="setExpanded('advanced', false)"
      >
        <span slot="label" class="section-label">
          Advanced
          <wa-badge v-if="advancedCount > 0" appearance="filled" variant="brand" pill>
            {{ advancedCount }}
          </wa-badge>
        </span>
        <div class="section-fields">
          <wa-input v-model="name" label="Name" :aria-invalid="!!nameError" @change="commitName">
            <span
              slot="hint"
              :class="{ 'field-error': nameError }"
              :role="nameError ? 'alert' : undefined"
            >
              {{ nameError || HINTS.name }}
            </span>
          </wa-input>
          <wa-input
            v-if="supportsAppearance"
            v-model="appearance"
            label="Appearance"
            hint="Display style, e.g. minimal, field-list, multiline."
            @change="commitAppearance"
          ></wa-input>
          <wa-input
            v-if="supportsValueFields"
            v-model="defaultValue"
            label="Default answer"
            hint="Pre-filled value respondents can change."
            @change="commitDefault"
          ></wa-input>
          <wa-textarea
            v-if="isSelectType"
            v-model="choiceFilter"
            label="Filter choices by"
            resize="auto"
            rows="1"
            @change="commitChoiceFilter"
          >
            <span slot="hint" :class="{ 'field-warning': choiceFilterWarning }">
              {{ choiceFilterWarning || HINTS.choiceFilter }}
            </span>
          </wa-textarea>
          <wa-checkbox
            v-if="supportsReadonly"
            :checked="readonly"
            hint="Shown but can't be edited."
            @change="
              readonly = ($event.target as HTMLInputElement).checked;
              commitReadonly();
            "
          >
            Read-only
          </wa-checkbox>
        </div>
      </wa-accordion-item>
    </wa-accordion>
  </aside>
</template>

<style scoped lang="scss">
.node-inspector {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: $color-bg-primary;
}

.inspector-header {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  padding: $spacing-md;
  border-bottom: 1px solid $color-border;
}

.inspector-title {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: $spacing-xs;
  flex: 1;
  min-width: 0;
}

.inspector-heading {
  margin: 0;
  color: $color-text-heading;
  font-size: $font-size-large;
  font-weight: $font-weight-semibold;
  line-height: $line-height-dense;
  overflow-wrap: anywhere;
}

.inspector-name {
  color: $color-text-secondary;
  font-size: $font-size-small;
}

.inspector-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xl $spacing-md;
  text-align: center;
  color: $color-text-primary;

  p {
    margin: 0;
    color: $color-text-secondary;
    font-size: $font-size-small;
    max-width: 20rem;
  }
}

.inspector-empty-icon {
  font-size: 1.5rem;
  opacity: 0.3;
}

.inspector-sections {
  flex: 1;
  min-height: 0;
  overflow-y: auto;

  wa-accordion-item {
    --spacing: #{$spacing-md};
    border-bottom: 1px solid $color-border;
  }
}

.section-label {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  font-weight: $font-weight-semibold;
  color: $color-text-heading;
}

.section-fields {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.field-error {
  color: $color-primary;
  font-weight: $font-weight-semibold;
}

.field-warning {
  color: var(--wa-color-warning-on-quiet);
  font-weight: $font-weight-semibold;
}

.choice-table {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.choice-row {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr) auto;
  align-items: center;
  gap: $spacing-xs;
}

.choice-header {
  font-size: $font-size-x-small;
  font-weight: $font-weight-semibold;
  color: $color-text-secondary;
  text-transform: uppercase;
  letter-spacing: $letter-spacing-loose;

  span:last-child {
    width: var(--wa-form-control-height-s, 2rem);
  }
}

.add-choice {
  align-self: flex-start;
}
</style>
