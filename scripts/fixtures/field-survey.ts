import type { XLSFormDocument } from '../../src/types/xlsform';

export const fieldSurvey: XLSFormDocument = {
  survey: [
    {
      id: 'q1',
      type: 'text',
      name: 'respondent_name',
      label: { 'English (en)': 'What is your name?', 'Spanish (es)': '¿Cuál es tu nombre?' },
    },
    {
      id: 'q2',
      type: 'integer',
      name: 'age',
      label: { 'English (en)': 'How old are you?', 'Spanish (es)': '¿Cuántos años tienes?' },
      required: 'yes',
      constraint: '. > 0 and . < 150',
      constraintMessage: {
        'English (en)': 'Age must be between 1 and 149',
        'Spanish (es)': 'La edad debe estar entre 1 y 149',
      },
    },
    {
      id: 'g1',
      type: 'group',
      name: 'location_info',
      label: { 'English (en)': 'Location', 'Spanish (es)': 'Ubicación' },
      children: [
        {
          id: 'q3',
          type: 'geopoint',
          name: 'gps',
          label: { 'English (en)': 'Record GPS', 'Spanish (es)': 'Registrar GPS' },
        },
        {
          id: 'q4',
          type: 'select_one',
          name: 'region',
          label: { 'English (en)': 'Select region', 'Spanish (es)': 'Seleccionar región' },
          listName: 'regions',
        },
      ],
    },
    {
      id: 'q5',
      type: 'select_multiple',
      name: 'services_needed',
      label: {
        'English (en)': 'Services needed?',
        'Spanish (es)': '¿Servicios necesarios?',
      },
      listName: 'services',
    },
    {
      id: 'q6',
      type: 'note',
      name: 'thank_you',
      label: { 'English (en)': 'Thank you!', 'Spanish (es)': '¡Gracias!' },
    },
  ],
  choices: [
    {
      listName: 'regions',
      choices: [
        { name: 'north', label: { 'English (en)': 'North', 'Spanish (es)': 'Norte' } },
        { name: 'south', label: { 'English (en)': 'South', 'Spanish (es)': 'Sur' } },
        { name: 'east', label: { 'English (en)': 'East', 'Spanish (es)': 'Este' } },
        { name: 'west', label: { 'English (en)': 'West', 'Spanish (es)': 'Oeste' } },
      ],
    },
    {
      listName: 'services',
      choices: [
        { name: 'water', label: { 'English (en)': 'Water', 'Spanish (es)': 'Agua' } },
        { name: 'shelter', label: { 'English (en)': 'Shelter', 'Spanish (es)': 'Refugio' } },
        { name: 'food', label: { 'English (en)': 'Food', 'Spanish (es)': 'Comida' } },
      ],
    },
  ],
  settings: {
    formTitle: 'Field Survey',
    formId: 'field_survey_v1',
    version: '2026-02-02',
    defaultLanguage: 'English (en)',
  },
  languages: ['English (en)', 'Spanish (es)'],
};
