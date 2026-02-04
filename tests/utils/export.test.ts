import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import type { ChoiceList, FormSettings, XLSFormDocument } from '@/types/xlsform';
import { exportToXlsx, flattenChoices, flattenSettings, rowsToSheet } from '@/utils/export';
import type { SurveyRow } from '@/utils/tree';

describe('flattenChoices', () => {
  it('flattens a single list', () => {
    const choices: ChoiceList[] = [
      {
        listName: 'colors',
        choices: [
          { name: 'red', label: 'Red' },
          { name: 'blue', label: 'Blue' },
        ],
      },
    ];
    const rows = flattenChoices(choices, []);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ list_name: 'colors', name: 'red', label: 'Red' });
    expect(rows[1]).toEqual({ list_name: 'colors', name: 'blue', label: 'Blue' });
  });

  it('flattens multiple lists', () => {
    const choices: ChoiceList[] = [
      {
        listName: 'colors',
        choices: [{ name: 'red', label: 'Red' }],
      },
      {
        listName: 'sizes',
        choices: [{ name: 'sm', label: 'Small' }],
      },
    ];
    const rows = flattenChoices(choices, []);
    expect(rows).toHaveLength(2);
    expect(rows[0]['list_name']).toBe('colors');
    expect(rows[1]['list_name']).toBe('sizes');
  });

  it('expands localized labels', () => {
    const choices: ChoiceList[] = [
      {
        listName: 'yesno',
        choices: [{ name: 'yes', label: { English: 'Yes', French: 'Oui' } }],
      },
    ];
    const rows = flattenChoices(choices, ['English', 'French']);
    expect(rows[0]['label::English']).toBe('Yes');
    expect(rows[0]['label::French']).toBe('Oui');
    expect(rows[0]['label']).toBeUndefined();
  });

  it('includes extra fields', () => {
    const choices: ChoiceList[] = [
      {
        listName: 'items',
        choices: [{ name: 'a', label: 'A', extra: { geometry: 'point(0 0)' } }],
      },
    ];
    const rows = flattenChoices(choices, []);
    expect(rows[0]['geometry']).toBe('point(0 0)');
  });

  it('returns empty array for empty input', () => {
    expect(flattenChoices([], [])).toEqual([]);
  });

  it('handles a list with no choices', () => {
    const choices: ChoiceList[] = [{ listName: 'empty', choices: [] }];
    expect(flattenChoices(choices, [])).toEqual([]);
  });
});

describe('flattenSettings', () => {
  it('maps required fields', () => {
    const settings: FormSettings = { formTitle: 'My Form', formId: 'my_form' };
    const rows = flattenSettings(settings);
    expect(rows).toHaveLength(1);
    expect(rows[0]['form_title']).toBe('My Form');
    expect(rows[0]['form_id']).toBe('my_form');
  });

  it('includes all optional fields', () => {
    const settings: FormSettings = {
      formTitle: 'T',
      formId: 'f',
      version: '1',
      defaultLanguage: 'English',
      style: 'pages',
    };
    const rows = flattenSettings(settings);
    expect(rows[0]['version']).toBe('1');
    expect(rows[0]['default_language']).toBe('English');
    expect(rows[0]['style']).toBe('pages');
  });

  it('includes extra fields', () => {
    const settings: FormSettings = {
      formTitle: 'T',
      formId: 'f',
      extra: { instance_name: 'concat(${name})' },
    };
    const rows = flattenSettings(settings);
    expect(rows[0]['instance_name']).toBe('concat(${name})');
  });

  it('applies COLUMN_MAP key transformation', () => {
    const settings: FormSettings = {
      formTitle: 'Title',
      formId: 'id',
      defaultLanguage: 'English',
    };
    const rows = flattenSettings(settings);
    expect(rows[0]['form_title']).toBeDefined();
    expect(rows[0]['form_id']).toBeDefined();
    expect(rows[0]['default_language']).toBeDefined();
    expect(rows[0]['formTitle']).toBeUndefined();
    expect(rows[0]['formId']).toBeUndefined();
    expect(rows[0]['defaultLanguage']).toBeUndefined();
  });
});

describe('rowsToSheet', () => {
  it('creates a sheet with correct headers and data', () => {
    const rows = [
      { type: 'text', name: 'q1', label: 'Name?' },
      { type: 'integer', name: 'q2', label: 'Age?' },
    ];
    const sheet = rowsToSheet(rows);
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
    expect(data).toHaveLength(2);
    expect(data[0]['type']).toBe('text');
    expect(data[0]['name']).toBe('q1');
    expect(data[1]['type']).toBe('integer');
  });

  it('handles rows with different key sets', () => {
    const rows: SurveyRow[] = [
      { type: 'text', name: 'q1' },
      { type: 'integer', name: 'q2', required: 'yes' },
    ];
    const sheet = rowsToSheet(rows);
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
    expect(data[0]['required']).toBeUndefined();
    expect(data[1]['required']).toBe('yes');
  });

  it('returns an empty sheet for empty input', () => {
    const sheet = rowsToSheet([]);
    const data = XLSX.utils.sheet_to_json(sheet);
    expect(data).toHaveLength(0);
  });
});

describe('exportToXlsx', () => {
  function makeDoc(overrides?: Partial<XLSFormDocument>): XLSFormDocument {
    return {
      survey: [
        {
          id: 'q1',
          type: 'text',
          name: 'name',
          label: 'Name?',
        },
      ],
      choices: [],
      settings: { formTitle: 'Test', formId: 'test' },
      languages: [],
      ...overrides,
    };
  }

  function readWorkbook(bytes: Uint8Array): XLSX.WorkBook {
    return XLSX.read(bytes, { type: 'array' });
  }

  it('produces valid XLSX output', () => {
    const bytes = exportToXlsx(makeDoc());
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);

    const wb = readWorkbook(bytes);
    expect(wb.SheetNames.length).toBeGreaterThan(0);
  });

  it('has correct sheet names when no choices', () => {
    const wb = readWorkbook(exportToXlsx(makeDoc()));
    expect(wb.SheetNames).toEqual(['survey', 'settings']);
  });

  it('skips choices sheet when choices are empty', () => {
    const wb = readWorkbook(exportToXlsx(makeDoc({ choices: [] })));
    expect(wb.SheetNames).not.toContain('choices');
  });

  it('includes choices sheet when populated', () => {
    const doc = makeDoc({
      choices: [
        {
          listName: 'yesno',
          choices: [
            { name: 'yes', label: 'Yes' },
            { name: 'no', label: 'No' },
          ],
        },
      ],
      survey: [
        {
          id: 'q1',
          type: 'select_one',
          name: 'confirm',
          label: 'Confirm?',
          listName: 'yesno',
        },
      ],
    });
    const wb = readWorkbook(exportToXlsx(doc));
    expect(wb.SheetNames).toContain('choices');
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets['choices']);
    expect(data).toHaveLength(2);
    expect(data[0]['list_name']).toBe('yesno');
    expect(data[0]['name']).toBe('yes');
  });

  it('survey content matches input', () => {
    const wb = readWorkbook(exportToXlsx(makeDoc()));
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets['survey']);
    expect(data).toHaveLength(1);
    expect(data[0]['type']).toBe('text');
    expect(data[0]['name']).toBe('name');
    expect(data[0]['label']).toBe('Name?');
  });

  it('settings content is correct', () => {
    const doc = makeDoc({
      settings: { formTitle: 'My Form', formId: 'my_form', version: '2024' },
    });
    const wb = readWorkbook(exportToXlsx(doc));
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets['settings']);
    expect(data).toHaveLength(1);
    expect(data[0]['form_title']).toBe('My Form');
    expect(data[0]['form_id']).toBe('my_form');
    expect(data[0]['version']).toBe('2024');
  });

  it('handles multi-language forms', () => {
    const doc = makeDoc({
      survey: [
        {
          id: 'q1',
          type: 'text',
          name: 'name',
          label: { English: 'Name?', French: 'Nom?' },
        },
      ],
      choices: [
        {
          listName: 'yesno',
          choices: [{ name: 'yes', label: { English: 'Yes', French: 'Oui' } }],
        },
      ],
      languages: ['English', 'French'],
    });
    const wb = readWorkbook(exportToXlsx(doc));
    const surveyData = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets['survey']);
    expect(surveyData[0]['label::English']).toBe('Name?');
    expect(surveyData[0]['label::French']).toBe('Nom?');

    const choiceData = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets['choices']);
    expect(choiceData[0]['label::English']).toBe('Yes');
    expect(choiceData[0]['label::French']).toBe('Oui');
  });

  it('sheet order is [survey, choices, settings]', () => {
    const doc = makeDoc({
      choices: [
        {
          listName: 'c',
          choices: [{ name: 'a', label: 'A' }],
        },
      ],
    });
    const wb = readWorkbook(exportToXlsx(doc));
    expect(wb.SheetNames).toEqual(['survey', 'choices', 'settings']);
  });
});
