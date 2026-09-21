export const PALETTE_SELECTOR = '.question-palette';
export const TREE_SELECTOR = '.builder-canvas-tree';

export function nodeSelector(nodeId: string): string {
  return `[data-node-id="${CSS.escape(nodeId)}"]`;
}

export function findNodeElement(nodeId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(nodeSelector(nodeId));
}
