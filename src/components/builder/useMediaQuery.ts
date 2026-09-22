import { type Ref, onMounted, onUnmounted, ref } from 'vue';

export const WIDE_LAYOUT_QUERY = '(min-width: 1024px)';

export function useMediaQuery(queryText: string): Ref<boolean> {
  const query = window.matchMedia(queryText);
  const matches = ref(query.matches);

  function onChange(e: MediaQueryListEvent): void {
    matches.value = e.matches;
  }

  onMounted(() => query.addEventListener('change', onChange));
  onUnmounted(() => query.removeEventListener('change', onChange));

  return matches;
}
