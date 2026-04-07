import { getRuntimeConfig } from '@/utils/runtimeConfig';
import type { XLSFormDocument } from '@/types/xlsform';

const API_BASE_URL = getRuntimeConfig('VITE_API_URL', 'http://localhost:3001');

function validateDocument(doc: unknown): asserts doc is XLSFormDocument {
  const d = doc as Record<string, unknown>;
  if (!d || typeof d !== 'object') throw new Error('Invalid response: not an object');
  if (!Array.isArray(d.survey) || d.survey.length === 0) throw new Error('Invalid response: missing survey');
  if (!Array.isArray(d.choices)) throw new Error('Invalid response: missing choices');
  if (!d.settings || typeof d.settings !== 'object') throw new Error('Invalid response: missing settings');
  const s = d.settings as Record<string, unknown>;
  if (!s.formTitle || !s.formId) throw new Error('Invalid response: missing form title or ID');
  if (!Array.isArray(d.languages) || d.languages.length === 0) throw new Error('Invalid response: missing languages');
}

export async function generateForm(prompt: string): Promise<XLSFormDocument> {
  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Generation failed');
  }
  const data = await response.json();
  validateDocument(data.document);
  return data.document;
}
