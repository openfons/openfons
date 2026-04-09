import type {
  ProviderStatus,
  SearchProviderId,
  UpgradeCandidate,
  ValidationResult
} from '@openfons/contracts';
import {
  loadConfigCenterState,
  resolveSearchRuntime,
  validateProjectConfig
} from '@openfons/config-center';
import {
  createDdgAdapter,
  createGoogleAdapter,
  createSearchGateway,
  type SearchRunStore as GatewayRunStore,
  type SearchProviderAdapter
} from '@openfons/search-gateway';

const createAdapterFromResolvedPlugin = ({
  plugin,
  fetchImpl,
  ddgSearchImpl
}: {
  plugin: ReturnType<typeof resolveSearchRuntime>['providers'][number];
  fetchImpl?: typeof fetch;
  ddgSearchImpl?: Parameters<typeof createDdgAdapter>[0]['searchImpl'];
}): [SearchProviderId, SearchProviderAdapter] => {
  switch (plugin.driver) {
    case 'google':
      return [
        'google',
        createGoogleAdapter({
          fetch: fetchImpl ?? fetch,
          apiKey: String(plugin.secrets.apiKeyRef.value),
          cx: String(plugin.secrets.cxRef.value)
        })
      ];
    case 'ddg':
      return [
        'ddg',
        createDdgAdapter({
          fetch: fetchImpl ?? fetch,
          endpoint: plugin.config.endpoint as string | undefined,
          searchImpl: ddgSearchImpl
        })
      ];
    default:
      throw new Error(`unsupported search driver ${plugin.driver}`);
  }
};

export const createRuntimeGateway = ({
  projectId,
  repoRoot,
  secretRoot,
  fetchImpl = fetch,
  ddgSearchImpl,
  dispatchCollectorRequests,
  runStore
}: {
  projectId: string;
  repoRoot: string;
  secretRoot?: string;
  fetchImpl?: typeof fetch;
  ddgSearchImpl?: Parameters<typeof createDdgAdapter>[0]['searchImpl'];
  dispatchCollectorRequests?: (candidates: UpgradeCandidate[]) => Promise<void>;
  runStore?: GatewayRunStore;
}) => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const runtime = resolveSearchRuntime({ state, projectId });

  const providers = Object.fromEntries(
    runtime.providers.map((plugin) =>
      createAdapterFromResolvedPlugin({ plugin, fetchImpl, ddgSearchImpl })
    )
  ) as Partial<Record<SearchProviderId, SearchProviderAdapter>>;

  return createSearchGateway({
    projectId,
    providers,
    dispatchCollectorRequests,
    runStore
  });
};

export const loadProviderStatus = (
  projectId: string,
  repoRoot: string,
  secretRoot?: string
): ProviderStatus[] => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const runtime = resolveSearchRuntime({ state, projectId });
  const validation = validateProjectConfig({ state, projectId });

  return runtime.providers.map((plugin) => ({
    providerId: plugin.driver as SearchProviderId,
    enabled: true,
    healthy: validation.status !== 'invalid',
    credentialResolvedFrom: 'project',
    degraded: validation.status !== 'valid',
    reason:
      validation.status === 'invalid'
        ? validation.errors.map((item) => item.message).join('; ')
        : undefined
  }));
};

export const loadValidation = (
  projectId: string,
  repoRoot: string,
  secretRoot?: string
): ValidationResult => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const validation = validateProjectConfig({ state, projectId });

  return {
    valid: validation.status === 'valid',
    errors: validation.errors.map((item) => item.message),
    warnings: validation.warnings.map((item) => item.message),
    resolvedProviders: loadProviderStatus(projectId, repoRoot, secretRoot)
  };
};
