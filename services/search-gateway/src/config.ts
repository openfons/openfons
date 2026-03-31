import type {
  ProviderStatus,
  SearchProviderId,
  UpgradeCandidate,
  ValidationResult
} from '@openfons/contracts';
import {
  createBaiduAdapter,
  createBingAdapter,
  createBraveAdapter,
  createDdgAdapter,
  createGoogleAdapter,
  createSearchGateway,
  createTavilyAdapter,
  getProviderStatus as getBaseProviderStatus,
  type SearchRunStore as GatewayRunStore,
  type SearchProviderAdapter
} from '@openfons/search-gateway';

type EnvShape = Record<string, string | undefined>;

const DEFAULT_BING_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/search';

const resolveEnvValue = (
  env: EnvShape,
  projectId: string | undefined,
  providerId: SearchProviderId,
  field: string
) =>
  (projectId
    ? env[
        `${projectId.toUpperCase()}_${providerId.toUpperCase()}_${field.toUpperCase()}`
      ]
    : undefined) ?? env[`${providerId.toUpperCase()}_${field.toUpperCase()}`];

export const loadProviderAdapters = ({
  projectId,
  env = process.env,
  fetchImpl = fetch
}: {
  projectId?: string;
  env?: EnvShape;
  fetchImpl?: typeof fetch;
} = {}): Partial<Record<SearchProviderId, SearchProviderAdapter>> => {
  const adapters: Partial<Record<SearchProviderId, SearchProviderAdapter>> = {};

  const googleApiKey = resolveEnvValue(env, projectId, 'google', 'apiKey');
  const googleCx = resolveEnvValue(env, projectId, 'google', 'cx');
  if (googleApiKey && googleCx) {
    adapters.google = createGoogleAdapter({
      fetch: fetchImpl,
      apiKey: googleApiKey,
      cx: googleCx
    });
  }

  const bingApiKey = resolveEnvValue(env, projectId, 'bing', 'apiKey');
  const bingEndpoint =
    resolveEnvValue(env, projectId, 'bing', 'endpoint') ?? DEFAULT_BING_ENDPOINT;
  if (bingApiKey) {
    adapters.bing = createBingAdapter({
      fetch: fetchImpl,
      apiKey: bingApiKey,
      endpoint: bingEndpoint
    });
  }

  const baiduApiKey = resolveEnvValue(env, projectId, 'baidu', 'apiKey');
  const baiduSecretKey = resolveEnvValue(env, projectId, 'baidu', 'secretKey');
  const baiduEndpoint = resolveEnvValue(env, projectId, 'baidu', 'endpoint');
  if (baiduApiKey && baiduSecretKey && baiduEndpoint) {
    adapters.baidu = createBaiduAdapter({
      fetch: fetchImpl,
      apiKey: baiduApiKey,
      secretKey: baiduSecretKey,
      endpoint: baiduEndpoint
    });
  }

  const ddgEndpoint = resolveEnvValue(env, projectId, 'ddg', 'endpoint');
  if (ddgEndpoint) {
    adapters.ddg = createDdgAdapter({
      fetch: fetchImpl,
      endpoint: ddgEndpoint
    });
  }

  const braveApiKey = resolveEnvValue(env, projectId, 'brave', 'apiKey');
  if (braveApiKey) {
    adapters.brave = createBraveAdapter({
      fetch: fetchImpl,
      apiKey: braveApiKey
    });
  }

  const tavilyApiKey = resolveEnvValue(env, projectId, 'tavily', 'apiKey');
  if (tavilyApiKey) {
    adapters.tavily = createTavilyAdapter({
      fetch: fetchImpl,
      apiKey: tavilyApiKey
    });
  }

  return adapters;
};

export const loadProviderStatus = (
  projectId?: string,
  env: EnvShape = process.env
): ProviderStatus[] => {
  const baseStatuses = getBaseProviderStatus(projectId);
  const runtimeAdapters = loadProviderAdapters({ projectId, env });

  return baseStatuses.map((status) => {
    if (runtimeAdapters[status.providerId]) {
      return status;
    }

    if (!status.healthy) {
      return status;
    }

    return {
      ...status,
      healthy: false,
      degraded: true,
      reason: 'missing-runtime-config'
    };
  });
};

export const loadValidation = (
  projectId?: string,
  env: EnvShape = process.env
): ValidationResult => {
  const resolvedProviders = loadProviderStatus(projectId, env);

  return {
    valid: resolvedProviders.every((provider) => provider.healthy),
    errors: resolvedProviders
      .filter((provider) => !provider.healthy)
      .map((provider) => `${provider.providerId}: ${provider.reason ?? 'invalid'}`),
    warnings: [],
    resolvedProviders
  };
};

export const createRuntimeGateway = ({
  projectId,
  env = process.env,
  fetchImpl = fetch,
  dispatchCollectorRequests,
  runStore
}: {
  projectId: string;
  env?: EnvShape;
  fetchImpl?: typeof fetch;
  dispatchCollectorRequests?: (candidates: UpgradeCandidate[]) => Promise<void>;
  runStore?: GatewayRunStore;
}) =>
  createSearchGateway({
    projectId,
    providers: loadProviderAdapters({
      projectId,
      env,
      fetchImpl
    }),
    dispatchCollectorRequests,
    runStore
  });
