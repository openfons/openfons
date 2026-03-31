import type { SearchResult } from '@openfons/contracts';

export const buildDedupKey = (url: string) => {
  const parsed = new URL(url);
  return `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname}`.toLowerCase();
};

export const dedupeResults = (results: SearchResult[]) =>
  Array.from(
    results
      .reduce((map, result) => {
        const existing = map.get(result.dedupKey);
        if (!existing || result.rank < existing.rank) {
          map.set(result.dedupKey, result);
        }
        return map;
      }, new Map<string, SearchResult>())
      .values()
  );
