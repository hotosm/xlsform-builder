import { nextTick, watch } from 'vue';

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useBuilderUiStore } from '@/stores/builderUi';

describe('builderUi store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts idle', () => {
    const ui = useBuilderUiStore();
    expect(ui.isDragging).toBe(false);
    expect(ui.inspectorRequest).toBeNull();
  });

  it('tracks drag state', () => {
    const ui = useBuilderUiStore();
    ui.setDragging(true);
    expect(ui.isDragging).toBe(true);
    ui.setDragging(false);
    expect(ui.isDragging).toBe(false);
  });

  it('notifies watchers on every inspector request, even for the same node', async () => {
    const ui = useBuilderUiStore();
    const seen: boolean[] = [];
    watch(
      () => ui.inspectorRequest,
      (req) => {
        if (req) seen.push(req.focus);
      },
    );

    ui.requestInspector('q1', false);
    await nextTick();
    ui.requestInspector('q1', true);
    await nextTick();

    expect(seen).toEqual([false, true]);
    expect(ui.inspectorRequest).toEqual({ nodeId: 'q1', focus: true });
  });
});
