import { describe, expect, it } from 'vitest';

import { formIdFromTitle } from '@/utils/fileUtils';

describe('formIdFromTitle', () => {
  it('converts a title to an XLSForm id', () => {
    expect(formIdFromTitle('Untitled Form')).toBe('untitled_form');
    expect(formIdFromTitle('  Building damage (2026)! ')).toBe('building_damage_2026');
  });

  it('prefixes ids that would start with a digit', () => {
    expect(formIdFromTitle('2026 census')).toBe('form_2026_census');
  });

  it('falls back when nothing usable remains', () => {
    expect(formIdFromTitle('!!!')).toBe('untitled_form');
  });
});
