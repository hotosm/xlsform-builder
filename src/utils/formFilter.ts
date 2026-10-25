export const PAGE_SIZE = 12;

const normalize = (value: string | undefined | null) => (value ?? '').toLowerCase().trim();

/**
 * Match forms against a free-text query (title, location, description, tags)
 * and an optional exact tag. Every whitespace-separated query term must match.
 */
export function filterForms(forms: FormMetadata[], query: string, tag = ''): FormMetadata[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const activeTag = normalize(tag);

  return forms.filter((form) => {
    const tags = (form.tags ?? []).map(normalize);
    if (activeTag && !tags.includes(activeTag)) return false;
    if (terms.length === 0) return true;

    const haystack = [form.title, form.location, form.description, ...tags]
      .map(normalize)
      .join(' ');
    return terms.every((term) => haystack.includes(term));
  });
}

/** Read search state from a hash route such as `#/?q=water&tag=wash`. */
export function readSearchParams(hash: string): { query: string; tag: string } {
  const queryIndex = hash.indexOf('?');
  const params = new URLSearchParams(queryIndex === -1 ? '' : hash.slice(queryIndex + 1));
  return { query: params.get('q') ?? '', tag: params.get('tag') ?? '' };
}

/** Build a hash route for the given path, keeping only non-empty search state. */
export function buildSearchHash(path: string, query: string, tag: string): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  if (tag) params.set('tag', tag);
  const search = params.toString();
  return `#${path}${search ? `?${search}` : ''}`;
}
