import { ref } from 'vue';

export interface InspectorRequest {
  nodeId: string;
  focus: boolean;
  seq: number;
}

export const inspectorRequest = ref<InspectorRequest | null>(null);

let seq = 0;

export function requestInspector(nodeId: string, focus: boolean): void {
  inspectorRequest.value = { nodeId, focus, seq: ++seq };
}
