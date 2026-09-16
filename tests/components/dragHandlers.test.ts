import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  clonePaletteItem,
  commitDroppedNode,
  PALETTE_ITEMS,
  paletteTarget,
} from '@/components/builder/dragHandlers';
import { useFormStore } from '@/stores/form';
import type { XLSFormDocument } from '@/types/xlsform';

function makeSampleDocument(): XLSFormDocument {
  return {
    survey: [
      { id: 'q1', type: 'text', name: 'name', label: 'What is your name?' },
      {
        id: 'g1',
        type: 'group',
        name: 'demographics',
        label: 'Demographics',
        children: [{ id: 'q2', type: 'integer', name: 'age', label: 'Age?' }],
      },
      { id: 'q4', type: 'note', name: 'notes', label: 'Thank you!' },
    ],
    choices: [],
    settings: { formTitle: 'Sample', formId: 'sample' },
    languages: [],
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('clonePaletteItem', () => {
  it('sets listName for a select_one item', () => {
    const item = PALETTE_ITEMS.find((i) => i.type === 'select_one')!;

    const node = clonePaletteItem(item);

    expect(node.listName).toBeDefined();
  });

  it('is pure: calling it alone writes nothing to the store (aborted drag)', () => {
    const store = useFormStore();
    const item = PALETTE_ITEMS.find((i) => i.type === 'select_one')!;

    clonePaletteItem(item);

    expect(store.document.choices).toEqual([]);
  });
});

describe('commitDroppedNode', () => {
  it('creates exactly one matching choice list and selects the node', () => {
    const store = useFormStore();
    const item = PALETTE_ITEMS.find((i) => i.type === 'select_one')!;
    const node = clonePaletteItem(item);

    commitDroppedNode(store, node);

    const matching = store.document.choices.filter((l) => l.listName === node.listName);
    expect(matching).toHaveLength(1);
    expect(store.selectedNodeId).toBe(node.id);
  });
});

describe('paletteTarget', () => {
  it('targets inside a selected group/repeat', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());

    expect(paletteTarget(store.document.survey, 'g1')).toEqual({ parentId: 'g1', index: 1 });
  });

  it('targets the next sibling of a selected non-container node', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());

    expect(paletteTarget(store.document.survey, 'q1')).toEqual({ parentId: null, index: 1 });
  });

  it('targets root end when nothing is selected', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());

    expect(paletteTarget(store.document.survey, null)).toEqual({ parentId: null, index: 3 });
  });
});
