import { computed, ref, shallowRef, toRaw, watch } from 'vue';

import { defineStore } from 'pinia';

import { PALETTE_LABELS } from '@/components/builder/paletteItems';
import type {
  Choice,
  FormSettings,
  SurveyNode,
  XLSFormDocument,
  XLSFormType,
} from '@/types/xlsform';
import {
  findNode,
  findParent,
  insertNode,
  moveNode as moveNodeInTree,
  nextAvailableName,
  removeNode as removeNodeInTree,
  updateNode as updateNodeInTree,
} from '@/utils/tree';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nextLabelNumber(survey: SurveyNode[], prefix: string): number {
  const used = new Set<number>();
  const pattern = new RegExp(`^${escapeRegExp(prefix)} (\\d+)$`);

  function walk(nodes: SurveyNode[]): void {
    for (const node of nodes) {
      if (typeof node.label === 'string') {
        const match = pattern.exec(node.label);
        if (match) used.add(Number(match[1]));
      }
      if (node.children) walk(node.children);
    }
  }

  walk(survey);
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

const HISTORY_LIMIT = 50;

function emptyDocument(): XLSFormDocument {
  return {
    survey: [],
    choices: [],
    settings: { formTitle: 'Untitled Form', formId: 'untitled_form' },
    languages: [],
  };
}

const DRAFT_STORAGE_KEY = 'xlsform-builder:draft:v1';
const DRAFT_SAVE_DEBOUNCE_MS = 600;

interface DraftEnvelope {
  savedAt: number;
  document: XLSFormDocument;
}

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function isXLSFormDocument(value: unknown): value is XLSFormDocument {
  if (!value || typeof value !== 'object') return false;
  const doc = value as Partial<XLSFormDocument>;
  return Array.isArray(doc.survey) && Array.isArray(doc.choices) && !!doc.settings;
}

function saveDraft(doc: XLSFormDocument): number | null {
  if (!hasLocalStorage()) return null;
  const savedAt = Date.now();
  const envelope: DraftEnvelope = { savedAt, document: doc };
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(envelope));
    return savedAt;
  } catch {
    // Storage unavailable/full
    return null;
  }
}

function loadDraft(): DraftEnvelope | null {
  if (!hasLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftEnvelope> | null;
    if (!parsed || typeof parsed.savedAt !== 'number' || !isXLSFormDocument(parsed.document)) {
      return null;
    }
    return parsed as DraftEnvelope;
  } catch {
    return null;
  }
}

export function createNode(type: XLSFormType, survey: SurveyNode[] = []): SurveyNode {
  const id = crypto.randomUUID();
  const name = nextAvailableName(survey, type);
  const friendlyLabel = PALETTE_LABELS[type] ?? type;

  const node: SurveyNode = {
    id,
    type,
    name,
    label: `${friendlyLabel} ${nextLabelNumber(survey, friendlyLabel)}`,
  };

  if (type === 'group' || type === 'repeat') {
    node.children = [];
  }

  if (type === 'select_one' || type === 'select_multiple') {
    node.listName = `${name}_choices`;
  }

  return node;
}

function setChildrenAt(
  nodes: SurveyNode[],
  parentId: string | null,
  children: SurveyNode[],
): SurveyNode[] {
  if (parentId === null) {
    return structuredClone(children);
  }

  return nodes.map((node) => {
    const clone = structuredClone(node);
    if (clone.id === parentId) {
      clone.children = structuredClone(children);
      return clone;
    }
    if (clone.children) {
      clone.children = setChildrenAt(clone.children, parentId, children);
    }
    return clone;
  });
}

export const useFormStore = defineStore('form', () => {
  const document = ref<XLSFormDocument>(emptyDocument());
  const selectedNodeId = ref<string | null>(null);
  const lastSavedAt = ref<number | null>(null);

  const restoredDraft = loadDraft();
  if (restoredDraft) {
    document.value = restoredDraft.document;
    lastSavedAt.value = restoredDraft.savedAt;
  }

  const past = shallowRef<XLSFormDocument[]>([]);
  const future = shallowRef<XLSFormDocument[]>([]);
  let batchDepth = 0;
  let batchSnapshot: XLSFormDocument | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleDraftSave(): void {
    if (batchDepth > 0) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      const savedAt = saveDraft(toRaw(document.value));
      if (savedAt !== null) lastSavedAt.value = savedAt;
    }, DRAFT_SAVE_DEBOUNCE_MS);
  }

  watch(document, scheduleDraftSave, { deep: true });

  const canUndo = computed(() => past.value.length > 0);
  const canRedo = computed(() => future.value.length > 0);

  function snapshot(doc: XLSFormDocument): XLSFormDocument {
    return structuredClone(toRaw(doc));
  }

  function pushHistory(): void {
    if (batchDepth > 0) return;
    past.value = [...past.value, snapshot(document.value)].slice(-HISTORY_LIMIT);
    future.value = [];
  }

  function beginHistoryBatch(): void {
    if (batchDepth === 0) {
      batchSnapshot = snapshot(document.value);
    }
    batchDepth++;
  }

  function endHistoryBatch(): void {
    if (batchDepth === 0) return;
    batchDepth--;
    if (batchDepth === 0 && batchSnapshot) {
      const changed = JSON.stringify(batchSnapshot) !== JSON.stringify(toRaw(document.value));
      if (changed) {
        past.value = [...past.value, batchSnapshot].slice(-HISTORY_LIMIT);
        future.value = [];
      }
      batchSnapshot = null;
    }
    if (batchDepth === 0) scheduleDraftSave();
  }

  function undo(): void {
    const prev = past.value[past.value.length - 1];
    if (!prev) return;
    past.value = past.value.slice(0, -1);
    future.value = [...future.value, snapshot(document.value)];
    document.value = prev;
  }

  function redo(): void {
    const next = future.value[future.value.length - 1];
    if (!next) return;
    future.value = future.value.slice(0, -1);
    past.value = [...past.value, snapshot(document.value)];
    document.value = next;
  }

  function selectNode(nodeId: string | null): void {
    selectedNodeId.value = nodeId;
  }

  function addNode(type: XLSFormType, parentId: string | null, index: number): SurveyNode {
    beginHistoryBatch();
    const node = createNode(type, toRaw(document.value).survey);
    document.value.survey = insertNode(toRaw(document.value).survey, parentId, index, node);
    selectedNodeId.value = node.id;
    if (node.listName) {
      addChoiceList(node.listName);
    }
    endHistoryBatch();
    return node;
  }

  function applyMove(nodeId: string, newParentId: string | null, newIndex: number): void {
    const survey = toRaw(document.value).survey;
    const result = moveNodeInTree(survey, nodeId, newParentId, newIndex);
    if (result === survey) return;
    pushHistory();
    document.value.survey = result;
  }

  function moveNode(nodeId: string, newParentId: string | null, newIndex: number): void {
    applyMove(nodeId, newParentId, newIndex);
  }

  function moveNodeUp(nodeId: string): void {
    const result = findParent(document.value.survey, nodeId);
    if (!result || result.index === 0) return;
    const parentId = result.parent?.id ?? null;
    applyMove(nodeId, parentId, result.index - 1);
  }

  function moveNodeDown(nodeId: string): void {
    const result = findParent(document.value.survey, nodeId);
    if (!result || result.index >= result.children.length - 1) return;
    const parentId = result.parent?.id ?? null;
    applyMove(nodeId, parentId, result.index + 2);
  }

  function moveNodeIn(nodeId: string): void {
    const result = findParent(document.value.survey, nodeId);
    if (!result || result.index === 0) return;
    const previousSibling = result.children[result.index - 1];
    if (previousSibling.type !== 'group' && previousSibling.type !== 'repeat') return;
    const targetIndex = previousSibling.children?.length ?? 0;
    applyMove(nodeId, previousSibling.id, targetIndex);
  }

  function moveNodeOut(nodeId: string): void {
    const result = findParent(document.value.survey, nodeId);
    if (!result || !result.parent) return;
    const grandResult = findParent(document.value.survey, result.parent.id);
    if (!grandResult) return;
    const grandparentId = grandResult.parent?.id ?? null;
    applyMove(nodeId, grandparentId, grandResult.index + 1);
  }

  function removeNode(nodeId: string): void {
    const node = findNode(document.value.survey, nodeId);
    if (!node) return;
    pushHistory();
    if (
      selectedNodeId.value !== null &&
      (selectedNodeId.value === nodeId || findNode(node.children ?? [], selectedNodeId.value))
    ) {
      selectedNodeId.value = null;
    }
    document.value.survey = removeNodeInTree(toRaw(document.value).survey, nodeId);
  }

  function updateNode(nodeId: string, patch: Partial<Omit<SurveyNode, 'id' | 'children'>>): void {
    if (!findNode(document.value.survey, nodeId)) return;
    pushHistory();
    document.value.survey = updateNodeInTree(toRaw(document.value).survey, nodeId, patch);
  }

  function isIdInSubtree(node: SurveyNode, id: string): boolean {
    if (node.id === id) return true;
    return node.children ? node.children.some((child) => isIdInSubtree(child, id)) : false;
  }

  function replaceChildren(parentId: string | null, children: SurveyNode[]): SurveyNode[] {
    const current = toRaw(document.value).survey;
    if (parentId !== null && !findNode(current, parentId)) return current;

    const resolved = children.map(
      (child) => findNode(current, child.id) ?? structuredClone(toRaw(child)),
    );

    if (parentId !== null && resolved.some((node) => isIdInSubtree(node, parentId))) {
      return current;
    }

    let stripped = current;
    for (const node of resolved) {
      stripped = removeNodeInTree(stripped, node.id);
    }

    const result = setChildrenAt(stripped, parentId, resolved);

    if (JSON.stringify(result) === JSON.stringify(current)) {
      return current;
    }

    pushHistory();
    document.value.survey = result;
    return result;
  }

  function addChoiceList(listName: string): void {
    const choices = toRaw(document.value).choices;
    if (choices.some((list) => list.listName === listName)) return;
    pushHistory();
    document.value.choices = [...choices, { listName, choices: [] }];
  }

  function addChoice(listName: string, choice?: Partial<Choice>): void {
    pushHistory();
    const choices = toRaw(document.value).choices;
    const existing = choices.find((list) => list.listName === listName);
    const ordinal = (existing?.choices.length ?? 0) + 1;
    const newChoice: Choice = {
      name: choice?.name ?? `choice_${ordinal}`,
      label: choice?.label ?? `Choice ${ordinal}`,
      ...(choice?.extra ? { extra: choice.extra } : {}),
    };
    document.value.choices = existing
      ? choices.map((list) =>
          list.listName === listName ? { ...list, choices: [...list.choices, newChoice] } : list,
        )
      : [...choices, { listName, choices: [newChoice] }];
  }

  function removeChoice(listName: string, choiceName: string): void {
    const choices = toRaw(document.value).choices;
    const list = choices.find((l) => l.listName === listName);
    if (!list || !list.choices.some((c) => c.name === choiceName)) return;
    pushHistory();
    document.value.choices = choices.map((l) =>
      l.listName === listName
        ? { ...l, choices: l.choices.filter((c) => c.name !== choiceName) }
        : l,
    );
  }

  function updateSettings(patch: Partial<FormSettings>): void {
    pushHistory();
    document.value.settings = { ...toRaw(document.value).settings, ...patch };
  }

  function loadDocument(doc: XLSFormDocument): void {
    document.value = snapshot(doc);
    selectedNodeId.value = null;
    past.value = [];
    future.value = [];
    batchDepth = 0;
    batchSnapshot = null;
  }

  return {
    document,
    selectedNodeId,
    lastSavedAt,
    selectNode,
    addNode,
    moveNode,
    moveNodeUp,
    moveNodeDown,
    moveNodeIn,
    moveNodeOut,
    removeNode,
    updateNode,
    replaceChildren,
    addChoiceList,
    addChoice,
    removeChoice,
    updateSettings,
    loadDocument,
    undo,
    redo,
    canUndo,
    canRedo,
    beginHistoryBatch,
    endHistoryBatch,
  };
});
