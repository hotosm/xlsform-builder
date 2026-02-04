import * as XLSX from 'xlsx';

import type { ChoiceList, FormSettings, XLSFormDocument } from '@/types/xlsform';

import { COLUMN_MAP, type SurveyRow, expandLocalized, flattenTree } from './tree';

export function flattenChoices(choices: ChoiceList[], languages: string[]): SurveyRow[] {
  const rows: SurveyRow[] = [];

  for (const list of choices) {
    for (const choice of list.choices) {
      const row: SurveyRow = {
        list_name: list.listName,
        name: choice.name,
      };

      Object.assign(row, expandLocalized('label', choice.label, languages));

      if (choice.extra) {
        Object.assign(row, choice.extra);
      }

      rows.push(row);
    }
  }

  return rows;
}

export function flattenSettings(settings: FormSettings): SurveyRow[] {
  const row: SurveyRow = {};

  for (const [key, value] of Object.entries(settings)) {
    if (key === 'extra' || value === undefined) continue;
    const xlsKey = COLUMN_MAP[key] ?? key;
    row[xlsKey] = value as string;
  }

  if (settings.extra) {
    Object.assign(row, settings.extra);
  }

  return [row];
}

export function rowsToSheet(rows: SurveyRow[]): XLSX.WorkSheet {
  if (rows.length === 0) {
    return XLSX.utils.aoa_to_sheet([]);
  }

  const headerSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      headerSet.add(key);
    }
  }
  const headers = [...headerSet];

  const data: (string | undefined)[][] = [headers];
  for (const row of rows) {
    data.push(headers.map((h) => row[h]));
  }

  return XLSX.utils.aoa_to_sheet(data);
}

export function exportToXlsx(doc: XLSFormDocument): Uint8Array {
  const { rows: surveyRows } = flattenTree(doc.survey, doc.languages);
  const choiceRows = flattenChoices(doc.choices, doc.languages);
  const settingsRows = flattenSettings(doc.settings);

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, rowsToSheet(surveyRows), 'survey');

  if (choiceRows.length > 0) {
    XLSX.utils.book_append_sheet(wb, rowsToSheet(choiceRows), 'choices');
  }

  XLSX.utils.book_append_sheet(wb, rowsToSheet(settingsRows), 'settings');

  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
}
