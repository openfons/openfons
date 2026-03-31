import type { SearchProviderAdapter } from './base.js';

export const createGoogleAdapter = (deps: {
  fetch: typeof fetch;
  apiKey: string;
  cx: string;
}): SearchProviderAdapter => ({
  id: 'google',
  async search({ query, page, maxResults }) {
    const start = (page - 1) * maxResults + 1;
    const url = new URL('https://customsearch.googleapis.com/customsearch/v1');
    url.searchParams.set('key', deps.apiKey);
    url.searchParams.set('cx', deps.cx);
    url.searchParams.set('q', query);
    url.searchParams.set('num', String(maxResults));
    url.searchParams.set('start', String(start));

    const response = await deps.fetch(url);
    const payload = (await response.json()) as {
      items?: Array<{ title: string; link: string; snippet: string }>;
    };

    return (payload.items ?? []).map((item, index) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      rank: start + index,
      page
    }));
  }
});
