import type {
  ProviderStatus,
  ResolvedPluginRuntime,
  SearchProviderId,
  UpgradeCandidate,
  ValidationResult
} from '@openfons/contracts';
import {
  expandPluginDependencyClosure,
  loadConfigCenterState,
  loadProjectBinding,
  resolvePluginRuntimeById,
  resolveSearchSourceReadiness,
  validatePluginSelection
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
  plugin: ResolvedPluginRuntime;
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

const buildRuntimeProviders = ({
  projectId,
  repoRoot,
  secretRoot,
  fetchImpl,
  ddgSearchImpl
}: {
  projectId: string;
  repoRoot: string;
  secretRoot?: string;
  fetchImpl?: typeof fetch;
  ddgSearchImpl?: Parameters<typeof createDdgAdapter>[0]['searchImpl'];
}) => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const searchSource = resolveSearchSourceReadiness({ state, projectId });
  const providers = Object.fromEntries(
    searchSource.routes
      .filter((route) => route.status !== 'blocked')
      .map((route) => {
        const pluginId = String(route.detail.pluginId);
        const plugin = resolvePluginRuntimeById({ state, pluginId });

        return createAdapterFromResolvedPlugin({
          plugin,
          fetchImpl,
          ddgSearchImpl
        });
      })
  ) as Partial<Record<SearchProviderId, SearchProviderAdapter>>;

  return { providers, searchSource };
};

const asArray = <T>(value: T | T[] | undefined) =>
  !value ? [] : Array.isArray(value) ? value : [value];

const unique = <T>(items: T[]) =>
  items.filter((item, index) => items.indexOf(item) === index);

const collectSearchProviderIds = ({
  state,
  projectId
}: {
  state: ReturnType<typeof loadConfigCenterState>;
  projectId: string;
}) => {
  const binding = loadProjectBinding({ repoRoot: state.repoRoot, projectId });

  return unique([
    ...asArray(binding.roles.primarySearch),
    ...asArray(binding.roles.fallbackSearch),
    ...Object.values(binding.routes).flatMap((route) => route.discovery ?? [])
  ]);
};

const buildSearchValidation = ({
  state,
  providerIds
}: {
  state: ReturnType<typeof loadConfigCenterState>;
  providerIds: string[];
}) => {
  const pluginIds = expandPluginDependencyClosure({
    plugins: state.pluginInstances,
    seedPluginIds: providerIds
  });

  return {
    pluginIds,
    validation: validatePluginSelection({ state, pluginIds })
  };
};

const buildSearchProviderStatuses = ({
  state,
  projectId
}: {
  state: ReturnType<typeof loadConfigCenterState>;
  projectId: string;
}): ProviderStatus[] => {
  const providerIds = collectSearchProviderIds({ state, projectId });
  const pluginMap = new Map(state.pluginInstances.map((plugin) => [plugin.id, plugin]));

  return providerIds.flatMap((pluginId) => {
    const plugin = pluginMap.get(pluginId);
    if (!plugin || plugin.type !== 'search-provider') {
      return [];
    }

    const { validation } = buildSearchValidation({
      state,
      providerIds: [pluginId]
    });
    const messages =
      validation.status === 'invalid'
        ? validation.errors.map((item) => item.message)
        : validation.warnings.map((item) => item.message);

    return [
      {
        providerId: plugin.driver as SearchProviderId,
        enabled: plugin.enabled,
        healthy: validation.status !== 'invalid',
        credentialResolvedFrom: 'project',
        degraded: validation.status !== 'valid',
        reason: messages.length > 0 ? messages.join('; ') : undefined
      }
    ];
  });
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
  const { providers, searchSource } = buildRuntimeProviders({
    projectId,
    repoRoot,
    secretRoot,
    fetchImpl,
    ddgSearchImpl
  });

  return createSearchGateway({
    projectId,
    providers,
    dispatchCollectorRequests,
    resolveSourceReadiness: () => searchSource,
    runStore
  });
};

export const loadProviderStatus = (
  projectId: string,
  repoRoot: string,
  secretRoot?: string
): ProviderStatus[] =>
  buildSearchProviderStatuses({
    state: loadConfigCenterState({ repoRoot, secretRoot }),
    projectId
  });

export const loadValidation = (
  projectId: string,
  repoRoot: string,
  secretRoot?: string
): ValidationResult => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const providerIds = collectSearchProviderIds({ state, projectId });
  const { validation } = buildSearchValidation({ state, providerIds });

  return {
    valid: validation.status === 'valid',
    errors: validation.errors.map((item) => item.message),
    warnings: validation.warnings.map((item) => item.message),
    resolvedProviders: buildSearchProviderStatuses({ state, projectId })
  };
};
