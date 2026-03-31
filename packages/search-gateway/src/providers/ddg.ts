import type { SearchProviderAdapter } from './base.js';

export const createDdgAdapter = (deps: {
  fetch: typeof fetch;
  endpoint: string;
}): SearchProviderAdapter => ({
  id: 'ddg',
  async search({ query, page, maxResults }) {
    const url = new URL(deps.endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('page', String(page));
    url.searchParams.set('size', String(maxResults));

    const response = await deps.fetch(url);
    const payload = (await response.json()) as {
      results?: Array<{ title: string; url: string; snippet: string }>;
    };

    return (payload.results ?? []).map((item, index) => ({
      title: item.title,
      url: item.url,
      snippet: item.snippet,
      rank: (page - 1) * maxResults + index + 1,
      page
    }));
  }
});
