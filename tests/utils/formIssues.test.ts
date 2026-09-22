import { describe, expect, it } from 'vitest';

import type { SurveyNode, XLSFormDocument } from '@/types/xlsform';
import { findFormIssues, unknownRefs } from '@/utils/formIssues';

function doc(survey: SurveyNode[], choices: XLSFormDocument['choices'] = []): XLSFormDocument {
  return {
    survey,
    choices,
    settings: { formTitle: 'Test', formId: 'test' },
    languages: [],
  };
}

describe('unknownRefs', () => {
  it('returns each missing name once', () => {
    const known = new Set(['age']);
    expect(unknownRefs('${age} > 1 and ${x} = ${x} or ${ y }', known)).toEqual(['x', 'y']);
  });
});

describe('findFormIssues', () => {
  it('returns nothing for a valid form', () => {
    const survey: SurveyNode[] = [
      { id: '1', type: 'integer', name: 'age', label: 'Age' },
      { id: '2', type: 'text', name: 'why', label: 'Why', relevant: '${age} > 18' },
    ];
    expect(findFormIssues(doc(survey))).toEqual([]);
  });

  it('reports missing refs in nested questions', () => {
    const survey: SurveyNode[] = [
      {
        id: 'g',
        type: 'group',
        name: 'grp',
        label: 'Group',
        children: [
          { id: 'c', type: 'calculate', name: 'total', label: '', calculation: '${price}' },
        ],
      },
    ];
    expect(findFormIssues(doc(survey))).toEqual([
      { nodeId: 'c', nodeLabel: 'total', message: 'Calculation refers to missing ${price}' },
    ]);
  });

  it('reports select questions with an empty choice list', () => {
    const survey: SurveyNode[] = [
      { id: 's', type: 'select_one', name: 'color', label: 'Color', listName: 'colors' },
    ];
    const issues = findFormIssues(doc(survey, [{ listName: 'colors', choices: [] }]));
    expect(issues.map((i) => i.message)).toEqual(['Has no choices']);
  });
});
