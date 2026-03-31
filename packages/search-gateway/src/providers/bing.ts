import type { SearchProviderAdapter } from './base.js';

export const createBingAdapter = (deps: {
  fetch: typeof fetch;
  apiKey: string;
  endpoint: string;
}): SearchProviderAdapter => ({
  id: 'bing',
  async search({ query, page, maxResults }) {
    const url = new URL(deps.endpoint);
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(maxResults));
    url.searchParams.set('offset', String((page - 1) * maxResults));

    const response = await deps.fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': deps.apiKey }
    });
    const payload = (await response.json()) as {
      webPages?: { value?: Array<{ name: string; url: string; snippet: string }> };
    };

    return (payload.webPages?.value ?? []).map((item, index) => ({
      title: item.name,
      url: item.url,
      snippet: item.snippet,
      rank: (page - 1) * maxResults + index + 1,
      page
    }));
  }
});
