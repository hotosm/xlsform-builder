import { getRuntimeConfig } from '@/utils/runtimeConfig';
import type { XLSFormDocument } from '@/types/xlsform';

const API_BASE_URL = getRuntimeConfig('VITE_API_URL', 'http://localhost:3001');

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
  return data.document;
}
