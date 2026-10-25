import { describe, expect, it } from 'vitest';

import { buildSearchHash, filterForms, readSearchParams } from '@/utils/formFilter';

function makeForm(overrides: Partial<FormMetadata> & { id: string }): FormMetadata {
  return {
    title: '',
    location: '',
    description: '',
    tags: [],
    url: '',
    external_link: '',
    ...overrides,
  };
}

const forms = [
  makeForm({
    id: 'a',
    title: 'Water Point Survey',
    location: 'Kenya',
    description: 'Mapping boreholes',
    tags: ['WASH', 'water'],
  }),
  makeForm({
    id: 'b',
    title: 'Building Footprints',
    location: 'Nepal',
    description: 'Post-earthquake damage assessment',
    tags: ['buildings', 'disaster'],
  }),
  makeForm({ id: 'c', title: 'Health Facilities', location: 'Global', tags: ['health'] }),
];

const ids = (result: FormMetadata[]) => result.map((form) => form.id);

describe('filterForms', () => {
  it('returns every form for an empty query and tag', () => {
    expect(ids(filterForms(forms, '   '))).toEqual(['a', 'b', 'c']);
  });

  it('matches title, location, description and tags case-insensitively', () => {
    expect(ids(filterForms(forms, 'water point'))).toEqual(['a']);
    expect(ids(filterForms(forms, 'NEPAL'))).toEqual(['b']);
    expect(ids(filterForms(forms, 'earthquake'))).toEqual(['b']);
    expect(ids(filterForms(forms, 'wash'))).toEqual(['a']);
  });

  it('requires every term to match', () => {
    expect(ids(filterForms(forms, 'kenya buildings'))).toEqual([]);
  });

  it('filters by exact tag, combined with the query', () => {
    expect(ids(filterForms(forms, '', 'wash'))).toEqual(['a']);
    expect(ids(filterForms(forms, 'nepal', 'wash'))).toEqual([]);
    expect(ids(filterForms(forms, '', 'wat'))).toEqual([]);
  });

  it('tolerates forms with missing fields', () => {
    const partial = { id: 'd', title: 'Roads' } as FormMetadata;
    expect(ids(filterForms([partial], 'roads'))).toEqual(['d']);
    expect(ids(filterForms([partial], '', 'roads'))).toEqual([]);
  });
});

describe('search hash helpers', () => {
  it('round-trips query and tag through the hash', () => {
    const hash = buildSearchHash('/', ' water & sanitation ', 'WASH');
    expect(hash).toBe('#/?q=water+%26+sanitation&tag=WASH');
    expect(readSearchParams(hash)).toEqual({ query: 'water & sanitation', tag: 'WASH' });
  });

  it('omits the query string when there is no search state', () => {
    expect(buildSearchHash('/', '', '')).toBe('#/');
    expect(readSearchParams('#/')).toEqual({ query: '', tag: '' });
  });
});
