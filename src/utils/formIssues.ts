import type { SurveyNode, XLSFormDocument } from '@/types/xlsform';

import { localizedText } from './localized';
import { collectNames } from './tree';

const REF_PATTERN = /\$\{([^}]+)\}/g;

const EXPRESSION_FIELDS = [
  ['relevant', 'Only show if'],
  ['calculation', 'Calculation'],
  ['constraint', 'Valid answers'],
  ['repeatCount', 'Number of repeats'],
  ['choiceFilter', 'Filter choices by'],
] as const;

export interface FormIssue {
  nodeId: string;
  nodeLabel: string;
  message: string;
}

export function unknownRefs(expression: string, knownNames: Set<string>): string[] {
  const missing = new Set<string>();
  for (const match of expression.matchAll(REF_PATTERN)) {
    const ref = match[1].trim();
    if (!knownNames.has(ref)) missing.add(ref);
  }
  return [...missing];
}

export function formatRefs(refs: string[]): string {
  return refs.map((r) => `\${${r}}`).join(', ');
}

export function findFormIssues(doc: XLSFormDocument): FormIssue[] {
  const knownNames = new Set(collectNames(doc.survey));
  const listSizes = new Map(doc.choices.map((l) => [l.listName, l.choices.length]));
  const issues: FormIssue[] = [];

  function visit(nodes: SurveyNode[]): void {
    for (const node of nodes) {
      const report = (message: string): void => {
        issues.push({
          nodeId: node.id,
          nodeLabel: localizedText(node.label, node.name) || node.name,
          message,
        });
      };

      for (const [field, fieldLabel] of EXPRESSION_FIELDS) {
        const missing = unknownRefs(node[field] ?? '', knownNames);
        if (missing.length > 0) {
          report(`${fieldLabel} refers to missing ${formatRefs(missing)}`);
        }
      }

      if (node.listName && !listSizes.get(node.listName)) {
        report('Has no choices');
      }

      if (node.children) visit(node.children);
    }
  }

  visit(doc.survey);
  return issues;
}
