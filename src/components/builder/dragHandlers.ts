import { createNode, type useFormStore } from '@/stores/form';
import type { SurveyNode, XLSFormType } from '@/types/xlsform';
import { findNode, findParent } from '@/utils/tree';

export type FormStore = ReturnType<typeof useFormStore>;

export interface PaletteItem {
  type: XLSFormType;
  label: string;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'text', label: 'Text' },
  { type: 'integer', label: 'Integer' },
  { type: 'decimal', label: 'Decimal' },
  { type: 'note', label: 'Note' },
  { type: 'select_one', label: 'Select One' },
  { type: 'select_multiple', label: 'Select Multiple' },
  { type: 'geopoint', label: 'Geopoint' },
  { type: 'geotrace', label: 'Geotrace' },
  { type: 'geoshape', label: 'Geoshape' },
  { type: 'date', label: 'Date' },
  { type: 'time', label: 'Time' },
  { type: 'dateTime', label: 'Date & Time' },
  { type: 'image', label: 'Image' },
  { type: 'audio', label: 'Audio' },
  { type: 'video', label: 'Video' },
  { type: 'file', label: 'File' },
  { type: 'barcode', label: 'Barcode' },
  { type: 'calculate', label: 'Calculate' },
  { type: 'acknowledge', label: 'Acknowledge' },
  { type: 'range', label: 'Range' },
  { type: 'rank', label: 'Rank' },
  { type: 'group', label: 'Group' },
  { type: 'repeat', label: 'Repeat' },
];

export function clonePaletteItem(item: PaletteItem): SurveyNode {
  return createNode(item.type);
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
