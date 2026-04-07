import type { ConfigCenterState } from '../loader.js';
import { resolveProjectRuntimeConfig } from '../resolver.js';

type RouteRuntime = ReturnType<typeof resolveProjectRuntimeConfig>['routes'][string];

export type ResolvedCrawlerRouteRuntime = {
  routeKey: string;
  mode: RouteRuntime['mode'];
  collection: NonNullable<RouteRuntime['collection']>;
  browser: RouteRuntime['browser'];
  accounts: NonNullable<RouteRuntime['accounts']>;
  cookies: NonNullable<RouteRuntime['cookies']>;
  proxy: RouteRuntime['proxy'];
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
  const runtime = resolveProjectRuntimeConfig({ state, projectId });
  const route = runtime.routes[routeKey];

  if (!route?.collection) {
    throw new Error(`route ${routeKey} does not define a collection adapter`);
  }

  return {
    routeKey,
    mode: route.mode,
    collection: route.collection,
    browser: route.browser,
    accounts: route.accounts ?? [],
    cookies: route.cookies ?? [],
    proxy: route.proxy
  };
};
