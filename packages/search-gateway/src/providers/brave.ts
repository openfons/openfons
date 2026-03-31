import type { SearchProviderAdapter } from './base.js';

export const createBraveAdapter = (deps: {
  fetch: typeof fetch;
  apiKey: string;
}): SearchProviderAdapter => ({
  id: 'brave',
  async search({ query, page, maxResults }) {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(maxResults));
    url.searchParams.set('page', String(page));

    const response = await deps.fetch(url, {
      headers: {
        'X-Subscription-Token': deps.apiKey,
        Accept: 'application/json'
      }
    });
    const payload = (await response.json()) as {
      web?: {
        results?: Array<{ title: string; url: string; description: string }>;
      };
    };

    return (payload.web?.results ?? []).map((item, index) => ({
      title: item.title,
      url: item.url,
      snippet: item.description,
      rank: (page - 1) * maxResults + index + 1,
      page
    }));
  }
});
