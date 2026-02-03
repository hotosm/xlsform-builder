import type { LocalizedString, SurveyNode } from '@/types/xlsform';

export type SurveyRow = Record<string, string>;

export const COLUMN_MAP: Record<string, string> = {
  listName: 'list_name',
  constraintMessage: 'constraint_message',
  choiceFilter: 'choice_filter',
  repeatCount: 'repeat_count',
  readonly: 'read_only',
  mediaImage: 'media::image',
  mediaAudio: 'media::audio',
  formTitle: 'form_title',
  formId: 'form_id',
  defaultLanguage: 'default_language',
};

export function findNode(tree: SurveyNode[], id: string): SurveyNode | null {
  for (const node of tree) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export interface FindParentResult {
  parent: SurveyNode | null;
  children: SurveyNode[];
  index: number;
}

export function findParent(tree: SurveyNode[], id: string): FindParentResult | null {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) {
      return { parent: null, children: tree, index: i };
    }
  }
  for (const node of tree) {
    if (node.children) {
      for (let i = 0; i < node.children.length; i++) {
        if (node.children[i].id === id) {
          return { parent: node, children: node.children, index: i };
        }
      }
      const found = findParent(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

export function removeNode(tree: SurveyNode[], id: string): SurveyNode[] {
  return tree.reduce<SurveyNode[]>((acc, node) => {
    if (node.id === id) {
      return acc;
    }
    const clone = structuredClone(node);
    if (clone.children) {
      clone.children = removeNode(clone.children, id);
    }
    acc.push(clone);
    return acc;
  }, []);
}

export function insertNode(
  tree: SurveyNode[],
  parentId: string | null,
  index: number,
  node: SurveyNode,
): SurveyNode[] {
  if (parentId === null) {
    const result = structuredClone(tree);
    const clampedIndex = Math.max(0, Math.min(index, result.length));
    result.splice(clampedIndex, 0, structuredClone(node));
    return result;
  }

  return tree.map((n) => {
    const clone = structuredClone(n);
    if (clone.id === parentId) {
      const children = clone.children ? [...clone.children] : [];
      const clampedIndex = Math.max(0, Math.min(index, children.length));
      children.splice(clampedIndex, 0, structuredClone(node));
      clone.children = children;
      return clone;
    }
    if (clone.children) {
      clone.children = insertNode(clone.children, parentId, index, node);
    }
    return clone;
  });
}

const INTERNAL_FIELDS = new Set(['id', 'children', 'extra']);

export function expandLocalized(
  key: string,
  value: LocalizedString,
  languages: string[],
): Record<string, string> {
  const xlsKey = COLUMN_MAP[key] ?? key;
  if (typeof value === 'string') {
    return { [xlsKey]: value };
  }
  const result: Record<string, string> = {};
  for (const lang of languages) {
    const langValue = value[lang];
    if (langValue !== undefined) {
      result[`${xlsKey}::${lang}`] = langValue;
    }
  }
  return result;
}

const LOCALIZABLE_FIELDS = new Set([
  'label',
  'hint',
  'constraintMessage',
]);

export interface FlattenResult {
  rows: SurveyRow[];
  rowToNode: Map<number, string>;
}

export function flattenTree(tree: SurveyNode[], languages: string[]): FlattenResult {
  const rows: SurveyRow[] = [];
  const rowToNode = new Map<number, string>();

  function walk(nodes: SurveyNode[]): void {
    for (const node of nodes) {
      const row: SurveyRow = {};

      let typeValue = node.type as string;
      if ((node.type === 'select_one' || node.type === 'select_multiple') && node.listName) {
        typeValue = `${node.type} ${node.listName}`;
      }

      if (node.type === 'group' || node.type === 'repeat') {
        typeValue = `begin_${node.type}`;
      }
      row['type'] = typeValue;

      for (const [key, value] of Object.entries(node)) {
        if (INTERNAL_FIELDS.has(key)) continue;
        if (key === 'type') continue;
        if (key === 'listName') continue;
        if (value === undefined) continue;

        if (LOCALIZABLE_FIELDS.has(key)) {
          Object.assign(row, expandLocalized(key, value as LocalizedString, languages));
          continue;
        }

        const xlsKey = COLUMN_MAP[key] ?? key;
        row[xlsKey] = value as string;
      }

      if (node.extra) {
        Object.assign(row, node.extra);
      }

      const rowIndex = rows.length;
      rows.push(row);
      rowToNode.set(rowIndex, node.id);

      if (node.children) {
        walk(node.children);

        const endRow: SurveyRow = {
          type: `end_${node.type}`,
          name: node.name,
        };
        rows.push(endRow);
      }
    }
  }

  walk(tree);
  return { rows, rowToNode };
}
