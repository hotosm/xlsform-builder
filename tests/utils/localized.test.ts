import { describe, expect, it } from 'vitest';

import { localizedText } from '@/utils/localized';

describe('localizedText', () => {
  it('returns a plain string value as-is', () => {
    expect(localizedText('Hello')).toBe('Hello');
  });

  it('returns the first localized value from a record', () => {
    expect(localizedText({ en: 'Hello', fr: 'Bonjour' })).toBe('Hello');
  });

  it('falls back when the record has no values', () => {
    expect(localizedText({}, 'fallback_name')).toBe('fallback_name');
  });

  it('falls back when the first value is an empty string', () => {
    expect(localizedText({ en: '' }, 'fallback_name')).toBe('fallback_name');
  });

  it('defaults the fallback to an empty string', () => {
    expect(localizedText({})).toBe('');
  });
});
