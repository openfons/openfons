import type { SearchProviderAdapter } from './base.js';

export const createTavilyAdapter = (deps: {
  fetch: typeof fetch;
  apiKey: string;
}): SearchProviderAdapter => ({
  id: 'tavily',
  async search({ query, page, maxResults }) {
    const response = await deps.fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: deps.apiKey,
        query,
        max_results: maxResults,
        page
      })
    });

    const payload = (await response.json()) as {
      results?: Array<{ title: string; url: string; content: string }>;
    };

    return (payload.results ?? []).map((item, index) => ({
      title: item.title,
      url: item.url,
      snippet: item.content,
      rank: (page - 1) * maxResults + index + 1,
      page
    }));
  }
});
