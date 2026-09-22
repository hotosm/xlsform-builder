export function sanitizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

export function generateUniqueFileName(title: string, originalFileName: string): string {
  const sanitized = sanitizeTitle(title);
  const extension = originalFileName.substring(originalFileName.lastIndexOf('.'));
  const timestamp = Date.now();

  return `${timestamp}-${sanitized || 'untitled'}${extension}`;
}

export function generateFormId(): string {
  return crypto.randomUUID();
}

export function formIdFromTitle(title: string): string {
  const id = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);
  if (!id) return 'untitled_form';
  return /^[0-9]/.test(id) ? `form_${id}` : id;
}
