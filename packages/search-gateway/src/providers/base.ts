import type {
  ProviderDiagnostic,
  SearchProviderId,
  SearchResult
} from '@openfons/contracts';

export type ProviderRawResult = {
  title: string;
  url: string;
  snippet: string;
  rank: number;
  page: number;
};

export type SearchProviderAdapter = {
  id: SearchProviderId;
  search: (input: {
    query: string;
    geo?: string;
    language?: string;
    page: number;
    maxResults: number;
  }) => Promise<ProviderRawResult[]>;
};

export const normalizeDomain = (value: string) =>
  new URL(value).hostname.replace(/^www\./, '');

export const guessSourceKind = (
  domain: string
): SearchResult['sourceKindGuess'] => {
  if (
    domain.endsWith('openai.com') ||
    domain.endsWith('google.com') ||
    domain.endsWith('openrouter.ai')
  ) {
    return 'official';
  }

  if (domain.endsWith('reddit.com') || domain.endsWith('github.com')) {
    return 'community';
  }

  return 'unknown';
};

export const buildDiagnostic = (input: {
  providerId: SearchProviderId;
  status: 'success' | 'degraded' | 'failed';
  degraded: boolean;
  reason: string;
  durationMs: number;
  resultCount: number;
  rateLimitState?: string;
}): ProviderDiagnostic => input;
