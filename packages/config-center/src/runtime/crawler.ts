import type { ConfigCenterState } from '../loader.js';
import { loadProjectBinding } from '../loader.js';
import {
  expandPluginDependencyClosure,
  resolvePluginRuntimeById
} from '../resolver.js';
import { validatePluginSelection } from '../validator.js';

type ResolvedRoutePlugin = ReturnType<typeof resolvePluginRuntimeById>;

export type ResolvedCrawlerRouteRuntime = {
  routeKey: string;
  mode: 'public-first' | 'requires-auth';
  collection: ResolvedRoutePlugin;
  browser: ResolvedRoutePlugin | undefined;
  accounts: ResolvedRoutePlugin[];
  cookies: ResolvedRoutePlugin[];
  proxy: ResolvedRoutePlugin | undefined;
};

export const resolveCrawlerRouteRuntime = ({
  state,
  projectId,
  routeKey
}: {
  state: ConfigCenterState;
  projectId: string;
  routeKey: string;
}): ResolvedCrawlerRouteRuntime => {
  const binding = loadProjectBinding({ repoRoot: state.repoRoot, projectId });
  const route = binding.routes[routeKey];

  if (!route?.collection) {
    throw new Error(`route ${routeKey} does not define a collection adapter`);
  }

  const seedPluginIds = [
    route.collection,
    ...(route.browser ? [route.browser] : []),
    ...(route.accounts ?? []),
    ...(route.cookies ?? []),
    ...(route.proxy ? [route.proxy] : [])
  ];
  const pluginIds = expandPluginDependencyClosure({
    plugins: state.pluginInstances,
    seedPluginIds
  });
  const validation = validatePluginSelection({ state, pluginIds });

  if (validation.status === 'invalid') {
    throw new Error(
      `config-center validation failed for ${projectId}: ${validation.errors
        .map((item) => item.message)
        .join('; ')}`
    );
  }

  return {
    routeKey,
    mode: route.mode,
    collection: resolvePluginRuntimeById({ state, pluginId: route.collection }),
    browser: route.browser
      ? resolvePluginRuntimeById({ state, pluginId: route.browser })
      : undefined,
    accounts: (route.accounts ?? []).map((pluginId) =>
      resolvePluginRuntimeById({ state, pluginId })
    ),
    cookies: (route.cookies ?? []).map((pluginId) =>
      resolvePluginRuntimeById({ state, pluginId })
    ),
    proxy: route.proxy
      ? resolvePluginRuntimeById({ state, pluginId: route.proxy })
      : undefined
  };
};
