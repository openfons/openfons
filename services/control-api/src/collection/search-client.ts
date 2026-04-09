import type { SearchRequest, SearchRunResult } from '@openfons/contracts';
import {
  loadConfigCenterState,
  resolveSearchRuntime
} from '@openfons/config-center';
import {
  createDdgAdapter,
  createGoogleAdapter,
  createSearchGateway
} from '@openfons/search-gateway';

export type SearchClient = {
  search: (request: SearchRequest) => Promise<SearchRunResult>;
};

export const createRuntimeSearchClient = ({
  projectId = 'openfons',
  repoRoot = process.cwd(),
  secretRoot,
  fetchImpl = fetch,
  ddgSearchImpl
}: {
  projectId?: string;
  repoRoot?: string;
  secretRoot?: string;
  fetchImpl?: typeof fetch;
  ddgSearchImpl?: Parameters<typeof import('@openfons/search-gateway').createDdgAdapter>[0]['searchImpl'];
} = {}): SearchClient => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const runtime = resolveSearchRuntime({ state, projectId });

  const providers = Object.fromEntries(
    runtime.providers.map((plugin) => {
      switch (plugin.driver) {
        case 'google':
          return [
            'google',
            createGoogleAdapter({
              fetch: fetchImpl,
              apiKey: String(plugin.secrets.apiKeyRef.value),
              cx: String(plugin.secrets.cxRef.value)
            })
          ];
        case 'ddg':
          return [
            'ddg',
            createDdgAdapter({
              fetch: fetchImpl,
              endpoint: plugin.config.endpoint as string | undefined,
              searchImpl: ddgSearchImpl
            })
          ];
        default:
          throw new Error(`unsupported search driver ${plugin.driver}`);
      }
    })
  );

  const gateway = createSearchGateway({
    projectId,
    providers
  });

  return {
    search: (request) => gateway.search(request)
  };
};
