import { describe, expect, it } from 'vitest';

import type { SurveyNode } from '@/types/xlsform';
import {
  COLUMN_MAP,
  collectNames,
  countListUsages,
  findNode,
  findParent,
  flattenTree,
  insertNode,
  moveNode,
  nextAvailableName,
  removeNode,
  updateNode,
} from '@/utils/tree';

function makeNode(overrides: Partial<SurveyNode> & { id: string; name: string }): SurveyNode {
  return {
    type: 'text',
    label: '',
    ...overrides,
  };
}

function makeSampleTree(): SurveyNode[] {
  return [
    makeNode({ id: 'q1', name: 'name', label: 'What is your name?' }),
    makeNode({
      id: 'g1',
      name: 'demographics',
      type: 'group',
      label: 'Demographics',
      children: [
        makeNode({ id: 'q2', name: 'age', type: 'integer', label: 'Age?' }),
        makeNode({
          id: 'q3',
          name: 'gender',
          type: 'select_one',
          label: 'Gender?',
          listName: 'genders',
        }),
      ],
    }),
    makeNode({ id: 'q4', name: 'notes', type: 'note', label: 'Thank you!' }),
  ];
}

describe('findNode', () => {
  it('finds a root-level node', () => {
    const tree = makeSampleTree();
    const node = findNode(tree, 'q1');
    expect(node).not.toBeNull();
    expect(node!.name).toBe('name');
  });

  it('finds a nested node', () => {
    const tree = makeSampleTree();
    const node = findNode(tree, 'q2');
    expect(node).not.toBeNull();
    expect(node!.name).toBe('age');
  });

  it('finds a group node', () => {
    const tree = makeSampleTree();
    const node = findNode(tree, 'g1');
    expect(node).not.toBeNull();
    expect(node!.type).toBe('group');
  });

  it('returns null for non-existent id', () => {
    const tree = makeSampleTree();
    expect(findNode(tree, 'missing')).toBeNull();
  });

  it('returns null for empty tree', () => {
    expect(findNode([], 'q1')).toBeNull();
  });
});

describe('findParent', () => {
  it('returns null parent for root-level node', () => {
    const tree = makeSampleTree();
    const result = findParent(tree, 'q1');
    expect(result).not.toBeNull();
    expect(result!.parent).toBeNull();
    expect(result!.children).toBe(tree);
    expect(result!.index).toBe(0);
  });

  it('returns the correct parent for a nested node', () => {
    const tree = makeSampleTree();
    const result = findParent(tree, 'q2');
    expect(result).not.toBeNull();
    expect(result!.parent!.id).toBe('g1');
    expect(result!.index).toBe(0);
  });

  it('returns the correct index for second child', () => {
    const tree = makeSampleTree();
    const result = findParent(tree, 'q3');
    expect(result).not.toBeNull();
    expect(result!.parent!.id).toBe('g1');
    expect(result!.index).toBe(1);
  });

  it('returns correct index for last root-level node', () => {
    const tree = makeSampleTree();
    const result = findParent(tree, 'q4');
    expect(result).not.toBeNull();
    expect(result!.parent).toBeNull();
    expect(result!.index).toBe(2);
  });

  it('returns null for non-existent id', () => {
    const tree = makeSampleTree();
    expect(findParent(tree, 'missing')).toBeNull();
  });

  it('returns null for empty tree', () => {
    expect(findParent([], 'q1')).toBeNull();
  });
});

describe('removeNode', () => {
  it('removes a root-level node', () => {
    const tree = makeSampleTree();
    const result = removeNode(tree, 'q1');
    expect(result).toHaveLength(2);
    expect(findNode(result, 'q1')).toBeNull();
  });

  it('removes a nested node', () => {
    const tree = makeSampleTree();
    const result = removeNode(tree, 'q2');
    const group = findNode(result, 'g1');
    expect(group!.children).toHaveLength(1);
    expect(group!.children![0].id).toBe('q3');
  });

  it('removes a group and its children', () => {
    const tree = makeSampleTree();
    const result = removeNode(tree, 'g1');
    expect(result).toHaveLength(2);
    expect(findNode(result, 'g1')).toBeNull();
    expect(findNode(result, 'q2')).toBeNull();
  });

  it('does not mutate the original tree', () => {
    const tree = makeSampleTree();
    const result = removeNode(tree, 'q1');
    expect(tree).toHaveLength(3);
    expect(result).toHaveLength(2);
  });

  it('returns a copy when id does not exist', () => {
    const tree = makeSampleTree();
    const result = removeNode(tree, 'missing');
    expect(result).toHaveLength(3);
    expect(result).not.toBe(tree);
  });
});

describe('insertNode', () => {
  const newNode = makeNode({ id: 'new1', name: 'new_field', label: 'New field' });

  it('inserts at root level when parentId is null', () => {
    const tree = makeSampleTree();
    const result = insertNode(tree, null, 0, newNode);
    expect(result).toHaveLength(4);
    expect(result[0].id).toBe('new1');
  });

  it('inserts at end of root when index exceeds length', () => {
    const tree = makeSampleTree();
    const result = insertNode(tree, null, 100, newNode);
    expect(result).toHaveLength(4);
    expect(result[3].id).toBe('new1');
  });

  it('inserts into a group', () => {
    const tree = makeSampleTree();
    const result = insertNode(tree, 'g1', 1, newNode);
    const group = findNode(result, 'g1');
    expect(group!.children).toHaveLength(3);
    expect(group!.children![1].id).toBe('new1');
  });

  it('inserts at start of group children', () => {
    const tree = makeSampleTree();
    const result = insertNode(tree, 'g1', 0, newNode);
    const group = findNode(result, 'g1');
    expect(group!.children![0].id).toBe('new1');
  });

  it('does not mutate the original tree', () => {
    const tree = makeSampleTree();
    insertNode(tree, null, 0, newNode);
    expect(tree).toHaveLength(3);
    expect(tree[0].id).toBe('q1');
  });

  it('does not mutate the inserted node', () => {
    const tree = makeSampleTree();
    const result = insertNode(tree, null, 0, newNode);
    result[0].name = 'mutated';
    expect(newNode.name).toBe('new_field');
  });

  it('inserts into a node without existing children', () => {
    const tree = [makeNode({ id: 'g1', name: 'group', type: 'group', label: 'G' })];
    const result = insertNode(tree, 'g1', 0, newNode);
    const group = findNode(result, 'g1');
    expect(group!.children).toHaveLength(1);
    expect(group!.children![0].id).toBe('new1');
  });

  it('clamps negative index to 0', () => {
    const tree = makeSampleTree();
    const result = insertNode(tree, null, -5, newNode);
    expect(result[0].id).toBe('new1');
  });
});

describe('moveNode', () => {
  it('is a no-op when moving a node into itself', () => {
    const tree = makeSampleTree();
    const result = moveNode(tree, 'g1', 'g1', 0);
    expect(result).toBe(tree);
  });

  it('is a no-op when moving a node into its own descendant', () => {
    const tree = makeSampleTree();
    const result = moveNode(tree, 'g1', 'q2', 0);
    expect(result).toBe(tree);
  });

  it('reorders within the same parent to a later index', () => {
    const tree = makeSampleTree();
    const result = moveNode(tree, 'q2', 'g1', 2);
    const group = findNode(result, 'g1');
    expect(group!.children!.map((n) => n.id)).toEqual(['q3', 'q2']);
  });

  it('reorders within the same parent to an earlier index', () => {
    const tree = makeSampleTree();
    const result = moveNode(tree, 'q3', 'g1', 0);
    const group = findNode(result, 'g1');
    expect(group!.children!.map((n) => n.id)).toEqual(['q3', 'q2']);
  });

  it('moves a root-level node into a group', () => {
    const tree = makeSampleTree();
    const result = moveNode(tree, 'q1', 'g1', 0);
    expect(result.map((n) => n.id)).toEqual(['g1', 'q4']);
    const group = findNode(result, 'g1');
    expect(group!.children!.map((n) => n.id)).toEqual(['q1', 'q2', 'q3']);
  });

  it('moves a node out of a group to root level', () => {
    const tree = makeSampleTree();
    const result = moveNode(tree, 'q2', null, 0);
    expect(result.map((n) => n.id)).toEqual(['q2', 'q1', 'g1', 'q4']);
    const group = findNode(result, 'g1');
    expect(group!.children!.map((n) => n.id)).toEqual(['q3']);
  });

  it('is a no-op when the new parent does not exist', () => {
    const tree = makeSampleTree();
    const result = moveNode(tree, 'q1', 'missing', 0);
    expect(result).toBe(tree);
  });

  it('is a no-op when the node to move does not exist', () => {
    const tree = makeSampleTree();
    const result = moveNode(tree, 'missing', 'g1', 0);
    expect(result).toBe(tree);
  });

  it('does not mutate the original tree', () => {
    const tree = makeSampleTree();
    moveNode(tree, 'q2', null, 0);
    expect(tree.map((n) => n.id)).toEqual(['q1', 'g1', 'q4']);
    const group = findNode(tree, 'g1');
    expect(group!.children!.map((n) => n.id)).toEqual(['q2', 'q3']);
  });
});

describe('updateNode', () => {
  it('shallow-merges a patch onto a root-level node', () => {
    const tree = makeSampleTree();
    const result = updateNode(tree, 'q1', { label: 'Updated label', required: 'yes' });
    const node = findNode(result, 'q1');
    expect(node!.label).toBe('Updated label');
    expect(node!.required).toBe('yes');
    expect(node!.name).toBe('name');
  });

  it('shallow-merges a patch onto a nested node', () => {
    const tree = makeSampleTree();
    const result = updateNode(tree, 'q2', { label: 'New age label' });
    const node = findNode(result, 'q2');
    expect(node!.label).toBe('New age label');
  });

  it('does not let a patch overwrite id or children', () => {
    const tree = makeSampleTree();
    const patch = { id: 'hacked', children: [] } as unknown as Partial<
      Omit<SurveyNode, 'id' | 'children'>
    >;
    const result = updateNode(tree, 'g1', patch);
    const node = findNode(result, 'g1');
    expect(node!.id).toBe('g1');
    expect(node!.children!.map((n) => n.id)).toEqual(['q2', 'q3']);
  });

  it('does not mutate the original tree', () => {
    const tree = makeSampleTree();
    updateNode(tree, 'q1', { label: 'Changed' });
    expect(findNode(tree, 'q1')!.label).toBe('What is your name?');
  });

  it('returns a copy when id does not exist', () => {
    const tree = makeSampleTree();
    const result = updateNode(tree, 'missing', { label: 'x' });
    expect(result).not.toBe(tree);
    expect(result).toHaveLength(3);
  });
});

describe('flattenTree', () => {
  it('flattens simple nodes into rows', () => {
    const tree = [makeNode({ id: 'q1', name: 'name', label: 'Name?' })];
    const { rows } = flattenTree(tree, []);
    expect(rows).toHaveLength(1);
    expect(rows[0]['type']).toBe('text');
    expect(rows[0]['name']).toBe('name');
    expect(rows[0]['label']).toBe('Name?');
  });

  it('expands groups into begin/end pairs', () => {
    const tree = [
      makeNode({
        id: 'g1',
        name: 'grp',
        type: 'group',
        label: 'Group',
        children: [makeNode({ id: 'q1', name: 'q', label: 'Q?' })],
      }),
    ];
    const { rows } = flattenTree(tree, []);
    expect(rows).toHaveLength(3);
    expect(rows[0]['type']).toBe('begin_group');
    expect(rows[0]['name']).toBe('grp');
    expect(rows[1]['type']).toBe('text');
    expect(rows[2]['type']).toBe('end_group');
    expect(rows[2]['name']).toBe('grp');
  });

  it('expands repeats into begin/end pairs', () => {
    const tree = [
      makeNode({
        id: 'r1',
        name: 'rep',
        type: 'repeat',
        label: 'Repeat',
        children: [makeNode({ id: 'q1', name: 'q', label: 'Q?' })],
      }),
    ];
    const { rows } = flattenTree(tree, []);
    expect(rows[0]['type']).toBe('begin_repeat');
    expect(rows[2]['type']).toBe('end_repeat');
  });

  it('rejoins select_one with listName', () => {
    const tree = [
      makeNode({
        id: 'q1',
        name: 'color',
        type: 'select_one',
        label: 'Color?',
        listName: 'colors',
      }),
    ];
    const { rows } = flattenTree(tree, []);
    expect(rows[0]['type']).toBe('select_one colors');
    expect(rows[0]['list_name']).toBeUndefined();
  });

  it('rejoins select_multiple with listName', () => {
    const tree = [
      makeNode({
        id: 'q1',
        name: 'fruits',
        type: 'select_multiple',
        label: 'Fruits?',
        listName: 'fruit_list',
      }),
    ];
    const { rows } = flattenTree(tree, []);
    expect(rows[0]['type']).toBe('select_multiple fruit_list');
  });

  it('applies COLUMN_MAP to camelCase fields', () => {
    const tree = [
      makeNode({
        id: 'q1',
        name: 'q',
        label: 'Q?',
        constraintMessage: 'Invalid',
        choiceFilter: 'name != "other"',
        readonly: 'yes',
      }),
    ];
    const { rows } = flattenTree(tree, []);
    expect(rows[0]['constraint_message']).toBe('Invalid');
    expect(rows[0]['choice_filter']).toBe('name != "other"');
    expect(rows[0]['read_only']).toBe('yes');
  });

  it('expands localized strings into language columns', () => {
    const tree = [
      makeNode({
        id: 'q1',
        name: 'q',
        label: { English: 'Name?', French: 'Nom?' },
        hint: { English: 'Enter name', French: 'Entrez le nom' },
      }),
    ];
    const { rows } = flattenTree(tree, ['English', 'French']);
    expect(rows[0]['label::English']).toBe('Name?');
    expect(rows[0]['label::French']).toBe('Nom?');
    expect(rows[0]['hint::English']).toBe('Enter name');
    expect(rows[0]['hint::French']).toBe('Entrez le nom');
  });

  it('handles single-language form with string labels', () => {
    const tree = [makeNode({ id: 'q1', name: 'q', label: 'Hello' })];
    const { rows } = flattenTree(tree, []);
    expect(rows[0]['label']).toBe('Hello');
  });

  it('builds rowToNode mapping', () => {
    const tree = makeSampleTree();
    const { rowToNode } = flattenTree(tree, []);
    expect(rowToNode.get(0)).toBe('q1');
    expect(rowToNode.get(1)).toBe('g1');
    expect(rowToNode.get(2)).toBe('q2');
    expect(rowToNode.get(3)).toBe('q3');
    expect(rowToNode.get(5)).toBe('q4');
    // end_group row (index 4) should NOT be in the map
    expect(rowToNode.has(4)).toBe(false);
  });

  it('does not include the internal id field in rows', () => {
    const tree = [makeNode({ id: 'q1', name: 'q', label: 'Q?' })];
    const { rows } = flattenTree(tree, []);
    expect(rows[0]['id']).toBeUndefined();
  });

  it('includes extra fields directly', () => {
    const tree = [
      makeNode({
        id: 'q1',
        name: 'q',
        label: 'Q?',
        extra: { 'body::accuracyThreshold': '10' },
      }),
    ];
    const { rows } = flattenTree(tree, []);
    expect(rows[0]['body::accuracyThreshold']).toBe('10');
  });

  it('handles empty tree', () => {
    const { rows, rowToNode } = flattenTree([], []);
    expect(rows).toHaveLength(0);
    expect(rowToNode.size).toBe(0);
  });

  it('handles nested groups', () => {
    const tree = [
      makeNode({
        id: 'g1',
        name: 'outer',
        type: 'group',
        label: 'Outer',
        children: [
          makeNode({
            id: 'g2',
            name: 'inner',
            type: 'group',
            label: 'Inner',
            children: [makeNode({ id: 'q1', name: 'q', label: 'Q?' })],
          }),
        ],
      }),
    ];
    const { rows } = flattenTree(tree, []);
    expect(rows.map((r) => r['type'])).toEqual([
      'begin_group',
      'begin_group',
      'text',
      'end_group',
      'end_group',
    ]);
  });

  it('applies COLUMN_MAP to constraintMessage in localized form', () => {
    const tree = [
      makeNode({
        id: 'q1',
        name: 'q',
        label: 'Q?',
        constraintMessage: { English: 'Bad value' },
      }),
    ];
    const { rows } = flattenTree(tree, ['English']);
    expect(rows[0]['constraint_message::English']).toBe('Bad value');
  });
});

describe('COLUMN_MAP', () => {
  it('maps camelCase keys to XLSForm columns', () => {
    expect(COLUMN_MAP['listName']).toBe('list_name');
    expect(COLUMN_MAP['constraintMessage']).toBe('constraint_message');
    expect(COLUMN_MAP['choiceFilter']).toBe('choice_filter');
    expect(COLUMN_MAP['repeatCount']).toBe('repeat_count');
    expect(COLUMN_MAP['readonly']).toBe('read_only');
    expect(COLUMN_MAP['mediaImage']).toBe('media::image');
    expect(COLUMN_MAP['mediaAudio']).toBe('media::audio');
  });
});

describe('collectNames', () => {
  it('collects names from every level of the tree', () => {
    const tree = makeSampleTree();
    expect(collectNames(tree).sort()).toEqual(
      ['age', 'demographics', 'gender', 'name', 'notes'].sort(),
    );
  });

  it('excludes the given id', () => {
    const tree = makeSampleTree();
    expect(collectNames(tree, 'q1')).not.toContain('name');
  });
});

describe('countListUsages', () => {
  it('returns 0 when no node references the list', () => {
    const tree = makeSampleTree();
    expect(countListUsages(tree, 'nonexistent')).toBe(0);
  });

  it('counts a single match nested inside a group', () => {
    const tree = makeSampleTree();
    expect(countListUsages(tree, 'genders')).toBe(1);
  });

  it('counts multiple nodes sharing the same list across different levels', () => {
    const tree = [
      makeNode({ id: 'a', name: 'a', type: 'select_one', listName: 'shared' }),
      makeNode({
        id: 'g1',
        name: 'g',
        type: 'group',
        children: [makeNode({ id: 'b', name: 'b', type: 'select_multiple', listName: 'shared' })],
      }),
    ];
    expect(countListUsages(tree, 'shared')).toBe(2);
  });
});

describe('nextAvailableName', () => {
  it('returns base_1 when the base name is unused', () => {
    const tree = makeSampleTree();
    expect(nextAvailableName(tree, 'text')).toBe('text_1');
  });

  it('skips taken numbers and returns the first free one', () => {
    const tree = [
      makeNode({ id: 'a', name: 'text_1' }),
      makeNode({ id: 'b', name: 'text_2' }),
    ];
    expect(nextAvailableName(tree, 'text')).toBe('text_3');
  });

  it('does not collide with a nested node using the same base', () => {
    const tree = makeSampleTree();
    expect(nextAvailableName(tree, 'age')).toBe('age_1');
  });
});
