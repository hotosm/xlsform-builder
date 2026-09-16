import { ref, toRaw } from 'vue';

import { defineStore } from 'pinia';

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
  removeNode as removeNodeInTree,
  updateNode as updateNodeInTree,
} from '@/utils/tree';

const HISTORY_LIMIT = 50;

function emptyDocument(): XLSFormDocument {
  return {
    survey: [],
    choices: [],
    settings: { formTitle: 'Untitled Form', formId: 'untitled_form' },
    languages: [],
  };
}

export function createNode(type: XLSFormType): SurveyNode {
  const id = crypto.randomUUID();
  const name = `${type}_${id.slice(0, 8)}`;

  const node: SurveyNode = {
    id,
    type,
    name,
    label: 'New question',
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

  let past: XLSFormDocument[] = [];
  let future: XLSFormDocument[] = [];
  let batchDepth = 0;
  let batchSnapshot: XLSFormDocument | null = null;

  function snapshot(doc: XLSFormDocument): XLSFormDocument {
    return structuredClone(toRaw(doc));
  }

  function pushHistory(): void {
    if (batchDepth > 0) return;
    past.push(snapshot(document.value));
    if (past.length > HISTORY_LIMIT) past.shift();
    future = [];
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
      past.push(batchSnapshot);
      if (past.length > HISTORY_LIMIT) past.shift();
      future = [];
      batchSnapshot = null;
    }
  }

  function undo(): void {
    const prev = past.pop();
    if (!prev) return;
    future.push(snapshot(document.value));
    document.value = prev;
  }

  function redo(): void {
    const next = future.pop();
    if (!next) return;
    past.push(snapshot(document.value));
    document.value = next;
  }

  function selectNode(nodeId: string | null): void {
    selectedNodeId.value = nodeId;
  }

  function addNode(type: XLSFormType, parentId: string | null, index: number): SurveyNode {
    beginHistoryBatch();
    const node = createNode(type);
    document.value.survey = insertNode(document.value.survey, parentId, index, node);
    selectedNodeId.value = node.id;
    if (node.listName) {
      addChoiceList(node.listName);
    }
    endHistoryBatch();
    return node;
  }

  function applyMove(nodeId: string, newParentId: string | null, newIndex: number): void {
    const result = moveNodeInTree(document.value.survey, nodeId, newParentId, newIndex);
    if (result === document.value.survey) return;
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
    document.value.survey = removeNodeInTree(document.value.survey, nodeId);
  }

  function updateNode(nodeId: string, patch: Partial<Omit<SurveyNode, 'id' | 'children'>>): void {
    if (!findNode(document.value.survey, nodeId)) return;
    pushHistory();
    document.value.survey = updateNodeInTree(document.value.survey, nodeId, patch);
  }

  function replaceChildren(parentId: string | null, children: SurveyNode[]): void {
    if (parentId !== null && !findNode(document.value.survey, parentId)) return;
    pushHistory();
    document.value.survey = setChildrenAt(document.value.survey, parentId, children);
  }

  function addChoiceList(listName: string): void {
    if (document.value.choices.some((list) => list.listName === listName)) return;
    pushHistory();
    document.value.choices = [...document.value.choices, { listName, choices: [] }];
  }

  function addChoice(listName: string, choice?: Partial<Choice>): void {
    pushHistory();
    const existing = document.value.choices.find((list) => list.listName === listName);
    const ordinal = (existing?.choices.length ?? 0) + 1;
    const newChoice: Choice = {
      name: choice?.name ?? `choice_${ordinal}`,
      label: choice?.label ?? `Choice ${ordinal}`,
      ...(choice?.extra ? { extra: choice.extra } : {}),
    };
    document.value.choices = existing
      ? document.value.choices.map((list) =>
          list.listName === listName ? { ...list, choices: [...list.choices, newChoice] } : list,
        )
      : [...document.value.choices, { listName, choices: [newChoice] }];
  }

  function removeChoice(listName: string, choiceName: string): void {
    const list = document.value.choices.find((l) => l.listName === listName);
    if (!list || !list.choices.some((c) => c.name === choiceName)) return;
    pushHistory();
    document.value.choices = document.value.choices.map((l) =>
      l.listName === listName
        ? { ...l, choices: l.choices.filter((c) => c.name !== choiceName) }
        : l,
    );
  }

  function updateSettings(patch: Partial<FormSettings>): void {
    pushHistory();
    document.value.settings = { ...document.value.settings, ...patch };
  }

  function loadDocument(doc: XLSFormDocument): void {
    document.value = snapshot(doc);
    selectedNodeId.value = null;
    past = [];
    future = [];
    batchDepth = 0;
    batchSnapshot = null;
  }

  return {
    document,
    selectedNodeId,
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
    beginHistoryBatch,
    endHistoryBatch,
  };
});
