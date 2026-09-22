import { describe, expect, it } from 'vitest';

import { friendlyErrorMessage } from '@/utils/errors';

describe('friendlyErrorMessage', () => {
  it('gives a friendly message for an "Invalid response" error', () => {
    expect(friendlyErrorMessage(new Error('Invalid response: bad shape'))).toBe(
      "The AI couldn't generate a valid form for that description, try rephrasing it.",
    );
  });

  it('passes through other Error messages', () => {
    expect(friendlyErrorMessage(new Error('Network timeout'))).toBe('Network timeout');
  });

  it('falls back to a generic message for non-Error throws', () => {
    expect(friendlyErrorMessage('boom')).toBe('Something went wrong.');
    expect(friendlyErrorMessage(undefined)).toBe('Something went wrong.');
  });
});
