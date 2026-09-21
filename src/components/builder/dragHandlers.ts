import { ref } from 'vue';

import { createNode, type useFormStore } from '@/stores/form';
import type { SurveyNode } from '@/types/xlsform';
import { findNode, findParent } from '@/utils/tree';

import { PALETTE_ITEMS, PALETTE_LABELS, type PaletteItem } from './paletteItems';

export type FormStore = ReturnType<typeof useFormStore>;

export const isDragging = ref(false);

export { PALETTE_ITEMS, PALETTE_LABELS, type PaletteItem };

export function clonePaletteItem(item: PaletteItem, survey: SurveyNode[] = []): SurveyNode {
  return createNode(item.type, survey);
}

export function commitDroppedNode(store: FormStore, node: SurveyNode): void {
  if (node.listName) {
    store.addChoiceList(node.listName);
  }
  store.selectNode(node.id);
}

export function paletteTarget(
  survey: SurveyNode[],
  selectedId: string | null,
): { parentId: string | null; index: number } {
  if (selectedId === null) {
    return { parentId: null, index: survey.length };
  }

  const selected = findNode(survey, selectedId);
  if (selected && (selected.type === 'group' || selected.type === 'repeat')) {
    return { parentId: selected.id, index: selected.children?.length ?? 0 };
  }

  const result = findParent(survey, selectedId);
  if (!result) {
    return { parentId: null, index: survey.length };
  }

  return { parentId: result.parent?.id ?? null, index: result.index + 1 };
}
