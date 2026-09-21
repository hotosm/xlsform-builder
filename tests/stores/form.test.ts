import { nextTick } from 'vue';

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFormStore } from '@/stores/form';
import type { XLSFormDocument } from '@/types/xlsform';

const DRAFT_STORAGE_KEY = 'xlsform-builder:draft:v1';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  get length(): number {
    return this.data.size;
  }
}

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

describe('updateNode listName (choice-list reuse)', () => {
  it('switches a select node to reference an existing choice list without touching document.choices', () => {
    const store = useFormStore();
    const doc = makeSampleDocument();
    doc.choices.push({ listName: 'yes_no', choices: [{ name: 'yes', label: 'Yes' }, { name: 'no', label: 'No' }] });
    store.loadDocument(doc);

    const choicesBefore = store.document.choices;

    store.updateNode('q3', { listName: 'yes_no' });

    const q3 = store.document.survey
      .find((n) => n.id === 'g1')!
      .children!.find((n) => n.id === 'q3')!;
    expect(q3.listName).toBe('yes_no');
    expect(store.document.choices).toEqual(choicesBefore);
  });

  it('undo restores the prior listName', () => {
    const store = useFormStore();
    const doc = makeSampleDocument();
    doc.choices.push({ listName: 'yes_no', choices: [{ name: 'yes', label: 'Yes' }] });
    store.loadDocument(doc);

    store.updateNode('q3', { listName: 'yes_no' });
    store.undo();

    const q3 = store.document.survey
      .find((n) => n.id === 'g1')!
      .children!.find((n) => n.id === 'q3')!;
    expect(q3.listName).toBe('genders');
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

describe('clearSurvey', () => {
  it('removes all questions and choice lists but keeps settings', () => {
    const store = useFormStore();
    const doc = makeSampleDocument();
    store.loadDocument(doc);
    store.selectNode('q1');

    store.clearSurvey();

    expect(store.document.survey).toEqual([]);
    expect(store.document.choices).toEqual([]);
    expect(store.document.settings).toEqual(doc.settings);
    expect(store.selectedNodeId).toBeNull();
  });

  it('can be undone', () => {
    const store = useFormStore();
    const doc = makeSampleDocument();
    store.loadDocument(doc);

    store.clearSurvey();
    store.undo();

    expect(store.document.survey).toEqual(doc.survey);
    expect(store.document.choices).toEqual(doc.choices);
  });

  it('is a no-op on an already empty form', () => {
    const store = useFormStore();
    store.loadDocument({ ...makeSampleDocument(), survey: [], choices: [] });

    store.clearSurvey();

    expect(store.canUndo).toBe(false);
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

  it('defaults the label to the friendly type name plus a number', () => {
    const store = useFormStore();

    const node = store.addNode('select_one', null, 0);

    expect(node.label).toBe('Select One 1');
  });

  it('gives sequential adds of the same type distinct default labels', () => {
    const store = useFormStore();

    const first = store.addNode('integer', null, 0);
    const second = store.addNode('integer', null, 1);

    expect(first.label).toBe('Integer 1');
    expect(second.label).toBe('Integer 2');
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

describe('draft persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it('debounces the save: nothing is written until the debounce window elapses', () => {
    const store = useFormStore();
    store.addNode('text', null, 0);

    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    vi.advanceTimersByTime(600);

    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
    expect(store.lastSavedAt).not.toBeNull();
  });

  it('coalesces rapid mutations into a single debounced save', () => {
    const store = useFormStore();

    store.addNode('text', null, 0);
    vi.advanceTimersByTime(300);
    store.addNode('integer', null, 1);
    vi.advanceTimersByTime(300);
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

    vi.advanceTimersByTime(300);
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
  });

  it('does not persist mutations made mid-batch, only once the batch ends', () => {
    const store = useFormStore();
    const node = store.addNode('text', null, 0);
    vi.advanceTimersByTime(600);

    store.beginHistoryBatch();
    store.updateNode(node.id, { label: 'Changed mid-drag' });
    vi.advanceTimersByTime(600);

    const midBatchSaved = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!);
    expect(
      midBatchSaved.document.survey.find((n: { id: string }) => n.id === node.id).label,
    ).not.toBe('Changed mid-drag');

    store.endHistoryBatch();
    vi.advanceTimersByTime(600);

    const afterBatchSaved = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!);
    expect(
      afterBatchSaved.document.survey.find((n: { id: string }) => n.id === node.id).label,
    ).toBe('Changed mid-drag');
  });

  it('persists settings changes and undo, which do not go through a history batch', async () => {
    const store = useFormStore();
    store.updateSettings({ formTitle: 'Renamed' });
    await nextTick();
    vi.advanceTimersByTime(600);
    expect(JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!).document.settings.formTitle).toBe(
      'Renamed',
    );

    store.undo();
    await nextTick();
    vi.advanceTimersByTime(600);
    expect(
      JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY)!).document.settings.formTitle,
    ).not.toBe('Renamed');
  });

  it('restores a persisted draft on store creation', () => {
    const doc: XLSFormDocument = {
      survey: [{ id: 'q1', type: 'text', name: 'name', label: 'Restored question' }],
      choices: [],
      settings: { formTitle: 'Restored Form', formId: 'restored_form' },
      languages: [],
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ savedAt: 12345, document: doc }));

    const store = useFormStore();

    expect(store.document.survey).toHaveLength(1);
    expect(store.document.settings.formTitle).toBe('Restored Form');
    expect(store.lastSavedAt).toBe(12345);
    expect(store.canUndo).toBe(false);
  });

  it('ignores malformed localStorage JSON without throwing', () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, 'not valid json{{{');

    expect(() => useFormStore()).not.toThrow();
    expect(useFormStore().document.survey).toEqual([]);
  });

  it('ignores a draft with an unexpected shape without throwing', () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ unexpected: true }));

    expect(() => useFormStore()).not.toThrow();
    expect(useFormStore().document.survey).toEqual([]);
  });

  it('does not crash when localStorage is unavailable', () => {
    delete (globalThis as { localStorage?: Storage }).localStorage;

    expect(() => useFormStore()).not.toThrow();
    const store = useFormStore();
    store.addNode('text', null, 0);
    expect(() => vi.advanceTimersByTime(600)).not.toThrow();
  });
});
