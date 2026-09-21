import { computed, nextTick, ref, watch } from 'vue';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFormStore } from '@/stores/form';
import type { XLSFormDocument } from '@/types/xlsform';
import { findNode } from '@/utils/tree';

// Mirrors the exact dependency NodeInspector.vue seeds its local form fields from.
// A regression here means NodeInspector will show stale data after any mutation that
// swaps the selected node's object identity without changing its id.
function useSelectedNodeUnderTest(store: ReturnType<typeof useFormStore>) {
  const node = computed(() =>
    store.selectedNodeId ? findNode(store.document.survey, store.selectedNodeId) : null,
  );
  const label = ref('');
  const constraintMessage = ref('');
  watch(
    node,
    (n) => {
      if (n) {
        label.value = n.label as string;
        constraintMessage.value = (n.constraintMessage as string) ?? '';
      }
    },
    { immediate: true },
  );
  return { node, label, constraintMessage };
}

function makeSampleDocument(): XLSFormDocument {
  return {
    survey: [{ id: 'q1', type: 'text', name: 'name', label: 'What is your name?' }],
    choices: [],
    settings: { formTitle: 'Sample', formId: 'sample' },
    languages: [],
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('selected-node editor sync', () => {
  it('re-seeds when the selected node is edited', async () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());
    store.selectNode('q1');

    const { label } = useSelectedNodeUnderTest(store);
    expect(label.value).toBe('What is your name?');

    store.updateNode('q1', { label: 'Changed' });
    await nextTick();

    expect(label.value).toBe('Changed');
  });

  it('re-seeds after undo reverts the selected node without changing selectedNodeId', async () => {
    const store = useFormStore();
    store.loadDocument(makeSampleDocument());
    store.selectNode('q1');

    const { label } = useSelectedNodeUnderTest(store);

    store.updateNode('q1', { label: 'Changed' });
    await nextTick();
    expect(label.value).toBe('Changed');

    store.undo();
    await nextTick();

    expect(store.selectedNodeId).toBe('q1');
    expect(label.value).toBe('What is your name?');
  });

  it('re-seeds after a drag reconciliation (replaceChildren) reclones the selected node', async () => {
    const store = useFormStore();
    store.loadDocument({
      survey: [
        { id: 'q1', type: 'text', name: 'name', label: 'What is your name?' },
        { id: 'g1', type: 'group', name: 'g', label: 'Group', children: [] },
      ],
      choices: [],
      settings: { formTitle: 'Sample', formId: 'sample' },
      languages: [],
    });
    store.selectNode('q1');

    const { node, label } = useSelectedNodeUnderTest(store);
    const before = node.value;

    const q1 = store.document.survey.find((n) => n.id === 'q1')!;
    store.replaceChildren('g1', [q1]);
    await nextTick();

    expect(node.value).not.toBe(before);
    expect(label.value).toBe('What is your name?');
  });

  it('re-seeds a newly-exposed field (constraintMessage) on edit, undo, and drag reconciliation', async () => {
    const store = useFormStore();
    store.loadDocument({
      survey: [
        {
          id: 'q1',
          type: 'integer',
          name: 'age',
          label: 'Age',
          constraintMessage: 'Must be positive',
        },
        { id: 'g1', type: 'group', name: 'g', label: 'Group', children: [] },
      ],
      choices: [],
      settings: { formTitle: 'Sample', formId: 'sample' },
      languages: [],
    });
    store.selectNode('q1');

    const { node, constraintMessage } = useSelectedNodeUnderTest(store);
    expect(constraintMessage.value).toBe('Must be positive');

    store.updateNode('q1', { constraintMessage: 'Too small' });
    await nextTick();
    expect(constraintMessage.value).toBe('Too small');

    store.undo();
    await nextTick();
    expect(store.selectedNodeId).toBe('q1');
    expect(constraintMessage.value).toBe('Must be positive');

    const before = node.value;
    const q1 = store.document.survey.find((n) => n.id === 'q1')!;
    store.replaceChildren('g1', [q1]);
    await nextTick();

    expect(node.value).not.toBe(before);
    expect(constraintMessage.value).toBe('Must be positive');
  });
});
