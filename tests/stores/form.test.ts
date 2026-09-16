import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

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
        children: [
          { id: 'q2', type: 'integer', name: 'age', label: 'Age?' },
          {
            id: 'q3',
            type: 'select_one',
            name: 'gender',
            label: 'Gender?',
            listName: 'genders',
          },
        ],
      },
      { id: 'q4', type: 'note', name: 'notes', label: 'Thank you!' },
    ],
    choices: [
      {
        listName: 'genders',
        choices: [
          { name: 'm', label: 'Male' },
          { name: 'f', label: 'Female' },
        ],
      },
    ],
    settings: { formTitle: 'Sample', formId: 'sample' },
    languages: [],
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('moveNode', () => {
  it('is a no-op when moving a node into its own descendant', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());
    const before = store.document.survey;

    store.moveNode('g1', 'q2', 0);

    expect(store.document.survey).toBe(before);
  });

  it('reorders within the same parent to a later index', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());

    store.moveNode('q2', 'g1', 2);

    const group = store.document.survey.find((n) => n.id === 'g1');
    expect(group!.children!.map((n) => n.id)).toEqual(['q3', 'q2']);
  });
});

describe('removeNode', () => {
  it('clears selection when the removed node itself was selected', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());
    store.selectNode('g1');

    store.removeNode('g1');

    expect(store.selectedNodeId).toBeNull();
  });

  it('clears selection when a descendant of the removed node was selected', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());
    store.selectNode('q3');

    store.removeNode('g1');

    expect(store.selectedNodeId).toBeNull();
  });

  it('leaves selection untouched when an unrelated node is removed', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());
    store.selectNode('q4');

    store.removeNode('g1');

    expect(store.selectedNodeId).toBe('q4');
  });
});

describe('addNode', () => {
  it('auto-creates a matching choice list for a select_one node', () => {
    const store = useFormStore();

    const node = store.addNode('select_one', null, 0);

    expect(node.listName).toBeDefined();
    const list = store.document.choices.find((l) => l.listName === node.listName);
    expect(list).toBeDefined();
    expect(list!.choices).toEqual([]);
  });

  it('auto-creates a matching choice list for a select_multiple node', () => {
    const store = useFormStore();

    const node = store.addNode('select_multiple', null, 0);

    const list = store.document.choices.find((l) => l.listName === node.listName);
    expect(list).toBeDefined();
  });

  it('does not create a choice list for a non-select node', () => {
    const store = useFormStore();

    store.addNode('text', null, 0);

    expect(store.document.choices).toHaveLength(0);
  });
});

describe('boundary no-ops', () => {
  it('moveNodeUp is a no-op at index 0', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());
    const before = store.document.survey;

    store.moveNodeUp('q1');

    expect(store.document.survey).toBe(before);
  });

  it('moveNodeDown is a no-op at the last index', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());
    const before = store.document.survey;

    store.moveNodeDown('q4');

    expect(store.document.survey).toBe(before);
  });

  it('moveNodeIn is a no-op when there is no previous sibling', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());
    const before = store.document.survey;

    store.moveNodeIn('q1');

    expect(store.document.survey).toBe(before);
  });

  it('moveNodeIn is a no-op when the previous sibling is not a group or repeat', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());
    const before = store.document.survey;

    // q3's previous sibling inside g1 is q2, an integer field
    store.moveNodeIn('q3');

    expect(store.document.survey).toBe(before);
  });

  it('moveNodeOut is a no-op at root', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());
    const before = store.document.survey;

    store.moveNodeOut('q1');

    expect(store.document.survey).toBe(before);
  });
});

describe('undo/redo', () => {
  it('round-trips a mutation through undo and redo', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());

    store.updateNode('q1', { label: 'Changed' });
    expect(store.document.survey.find((n) => n.id === 'q1')!.label).toBe('Changed');

    store.undo();
    expect(store.document.survey.find((n) => n.id === 'q1')!.label).toBe('What is your name?');

    store.redo();
    expect(store.document.survey.find((n) => n.id === 'q1')!.label).toBe('Changed');
  });

  it('clears redo history when a new mutation happens after undo', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());

    store.updateNode('q1', { label: 'First change' });
    store.undo();
    store.updateNode('q1', { label: 'Second change' });

    store.redo();

    expect(store.document.survey.find((n) => n.id === 'q1')!.label).toBe('Second change');
  });

  it('caps history at 50 entries, dropping the oldest', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());

    for (let i = 0; i < 55; i++) {
      store.updateNode('q1', { label: `label-${i}` });
    }

    for (let i = 0; i < 50; i++) {
      store.undo();
    }

    expect(store.document.survey.find((n) => n.id === 'q1')!.label).toBe('label-4');

    store.undo();
    expect(store.document.survey.find((n) => n.id === 'q1')!.label).toBe('label-4');
  });

  it('collapses a batched multi-action mutation into a single undo step', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());

    store.beginHistoryBatch();
    store.updateNode('q1', { label: 'Batch label' });
    store.updateNode('q4', { label: 'Batch note' });
    store.moveNodeUp('q4');
    store.endHistoryBatch();

    expect(store.document.survey.find((n) => n.id === 'q1')!.label).toBe('Batch label');

    store.undo();

    expect(store.document.survey.find((n) => n.id === 'q1')!.label).toBe('What is your name?');
    expect(store.document.survey.find((n) => n.id === 'q4')!.label).toBe('Thank you!');

    const before = JSON.stringify(store.document.survey);
    store.undo(); // history only had one entry (the whole batch); this is a no-op
    expect(JSON.stringify(store.document.survey)).toBe(before);
  });

  it('resets undo/redo history on loadDocument', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());
    store.updateNode('q1', { label: 'Changed' });

    store.loadDocument(makeSampleDocument());
    const before = store.document.survey;

    store.undo();

    expect(store.document.survey).toBe(before);
  });

  it('snapshots reactive document state without throwing DataCloneError', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());

    expect(() => store.updateNode('q1', { label: 'Reactive change' })).not.toThrow();
    expect(store.document.survey.find((n) => n.id === 'q1')!.label).toBe('Reactive change');

    store.undo();
    expect(store.document.survey.find((n) => n.id === 'q1')!.label).toBe('What is your name?');
  });
});

describe('canUndo/canRedo', () => {
  it('is false on a fresh store', () => {
    const store = useFormStore();

    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);
  });

  it('flips true after a mutation, and flips correctly across undo/redo', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());

    store.updateNode('q1', { label: 'Changed' });
    expect(store.canUndo).toBe(true);
    expect(store.canRedo).toBe(false);

    store.undo();
    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(true);

    store.redo();
    expect(store.canUndo).toBe(true);
    expect(store.canRedo).toBe(false);
  });
});

describe('replaceChildren', () => {
  function countOccurrences(nodes: XLSFormDocument['survey'], id: string): number {
    return nodes.reduce((count, node) => {
      const here = node.id === id ? 1 : 0;
      const inChildren = node.children ? countOccurrences(node.children, id) : 0;
      return count + here + inChildren;
    }, 0);
  }

  it('reconciles cross-container drag by id despite a stale source-list order', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());

    const q1 = store.document.survey.find((n) => n.id === 'q1')!;
    const g1 = store.document.survey.find((n) => n.id === 'g1')!;
    const q4 = store.document.survey.find((n) => n.id === 'q4')!;

    store.replaceChildren('g1', [...g1.children!, q1]);

    store.replaceChildren(null, [g1, q4]);

    const survey = store.document.survey;
    const finalG1 = survey.find((n) => n.id === 'g1')!;

    expect(finalG1.children!.map((n) => n.id)).toContain('q1');
    expect(countOccurrences(survey, 'q1')).toBe(1);
    expect(survey.some((n) => n.id === 'q1')).toBe(false);
  });

  it('adds no history entry when the array is unchanged', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());

    store.replaceChildren(null, store.document.survey);

    expect(store.canUndo).toBe(false);
  });

  it('collapses a batched cross-container drag into a single undo restoring the original tree', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());
    const original = JSON.stringify(store.document.survey);

    const q1 = store.document.survey.find((n) => n.id === 'q1')!;
    const g1 = store.document.survey.find((n) => n.id === 'g1')!;
    const q4 = store.document.survey.find((n) => n.id === 'q4')!;

    store.beginHistoryBatch();
    store.replaceChildren('g1', [...g1.children!, q1]);
    store.replaceChildren(null, [g1, q4]);
    store.endHistoryBatch();

    expect(store.document.survey.find((n) => n.id === 'g1')!.children!.map((n) => n.id)).toContain(
      'q1',
    );

    store.undo();

    expect(JSON.stringify(store.document.survey)).toBe(original);
    expect(store.canUndo).toBe(false);
  });

  it('leaves canUndo false when begin/end wraps no mutation', () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());

    store.beginHistoryBatch();
    store.endHistoryBatch();

    expect(store.canUndo).toBe(false);
  });
});
