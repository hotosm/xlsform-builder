import { ref, shallowRef } from 'vue';

import { defineStore } from 'pinia';

export interface InspectorRequest {
  nodeId: string;
  focus: boolean;
}

const COLLAPSED_PANELS_STORAGE_KEY = 'xlsform-builder.collapsed-panels';

type Panel = 'palette' | 'inspector';

function loadCollapsed(): Set<Panel> {
  try {
    const raw = localStorage.getItem(COLLAPSED_PANELS_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as Panel[]);
  } catch {
    // Fall back to both panels open.
  }
  return new Set();
}

export const useBuilderUiStore = defineStore('builderUi', () => {
  const isDragging = ref(false);
  const collapsedPanels = ref(loadCollapsed());
  const inspectorRequest = shallowRef<InspectorRequest | null>(null);

  function setDragging(value: boolean): void {
    isDragging.value = value;
  }

  function requestInspector(nodeId: string, focus: boolean): void {
    inspectorRequest.value = { nodeId, focus };
  }

  function isCollapsed(panel: Panel): boolean {
    return collapsedPanels.value.has(panel);
  }

  function setCollapsed(panel: Panel, collapsed: boolean): void {
    if (collapsed) collapsedPanels.value.add(panel);
    else collapsedPanels.value.delete(panel);
    try {
      localStorage.setItem(
        COLLAPSED_PANELS_STORAGE_KEY,
        JSON.stringify([...collapsedPanels.value]),
      );
    } catch {
      // Collapsed panels is a convenience, ignore storage failures.
    }
  }

  return {
    isDragging,
    inspectorRequest,
    setDragging,
    requestInspector,
    isCollapsed,
    setCollapsed,
  };
});
