import type { LocalizedString } from '@/types/xlsform';

export function localizedText(value: LocalizedString, fallback = ''): string {
  if (typeof value === 'string') return value;
  return Object.values(value)[0] || fallback;
}
