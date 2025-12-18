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
