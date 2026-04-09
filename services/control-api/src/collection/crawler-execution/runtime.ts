import {
  loadConfigCenterState,
  loadProjectBinding,
  resolveCrawlerRouteRuntime,
  type ResolvedCrawlerRouteRuntime
} from '@openfons/config-center';
import { resolveCrawlerRouteKeyForUrl } from '../crawler-adapters/registry.js';

const assertPluginType = ({
  routeKey,
  role,
  pluginId,
  actualType,
  expectedType
}: {
  routeKey: string;
  role: 'collection' | 'browser' | 'account' | 'cookie' | 'proxy';
  pluginId: string;
  actualType: string;
  expectedType:
    | 'crawler-adapter'
    | 'browser-runtime'
    | 'account-source'
    | 'cookie-source'
    | 'proxy-source';
}) => {
  if (actualType === expectedType) {
    return;
  }

  throw new Error(
    `invalid crawler runtime for route ${routeKey}: ${role} plugin ${pluginId} must be type ${expectedType}, got ${actualType}`
  );
};

const assertExecutableCrawlerRuntimeContract = (
  runtime: ResolvedCrawlerRouteRuntime
) => {
  assertPluginType({
    routeKey: runtime.routeKey,
    role: 'collection',
    pluginId: runtime.collection.pluginId,
    actualType: runtime.collection.type,
    expectedType: 'crawler-adapter'
  });

  if (runtime.browser) {
    assertPluginType({
      routeKey: runtime.routeKey,
      role: 'browser',
      pluginId: runtime.browser.pluginId,
      actualType: runtime.browser.type,
      expectedType: 'browser-runtime'
    });
  }

  for (const account of runtime.accounts) {
    assertPluginType({
      routeKey: runtime.routeKey,
      role: 'account',
      pluginId: account.pluginId,
      actualType: account.type,
      expectedType: 'account-source'
    });
  }

  for (const cookie of runtime.cookies) {
    assertPluginType({
      routeKey: runtime.routeKey,
      role: 'cookie',
      pluginId: cookie.pluginId,
      actualType: cookie.type,
      expectedType: 'cookie-source'
    });
  }

  if (runtime.proxy) {
    assertPluginType({
      routeKey: runtime.routeKey,
      role: 'proxy',
      pluginId: runtime.proxy.pluginId,
      actualType: runtime.proxy.type,
      expectedType: 'proxy-source'
    });
  }
};

export const resolveExecutableCrawlerRouteForUrl = ({
  projectId,
  repoRoot,
  secretRoot,
  url
}: {
  projectId: string;
  repoRoot: string;
  secretRoot?: string;
  url: string;
}): ResolvedCrawlerRouteRuntime | undefined => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const binding = loadProjectBinding({ repoRoot, projectId });
  const executableRouteKeys = Object.entries(binding.routes)
    .filter(([, route]) => Boolean(route.collection))
    .map(([routeKey]) => routeKey);
  const routeKey = resolveCrawlerRouteKeyForUrl({
    routeKeys: executableRouteKeys,
    url
  });

  if (!routeKey) {
    return undefined;
  }

  const runtime = resolveCrawlerRouteRuntime({ state, projectId, routeKey });
  assertExecutableCrawlerRuntimeContract(runtime);

  return runtime;
};
