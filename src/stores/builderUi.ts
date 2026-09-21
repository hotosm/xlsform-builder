import { ref, shallowRef } from 'vue';

import { defineStore } from 'pinia';

export interface InspectorRequest {
  nodeId: string;
  focus: boolean;
}

export const useBuilderUiStore = defineStore('builderUi', () => {
  const isDragging = ref(false);
  const inspectorRequest = shallowRef<InspectorRequest | null>(null);

  function setDragging(value: boolean): void {
    isDragging.value = value;
  }

  function requestInspector(nodeId: string, focus: boolean): void {
    inspectorRequest.value = { nodeId, focus };
  }

  return { isDragging, inspectorRequest, setDragging, requestInspector };
});
