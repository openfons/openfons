import type { ConfigCenterState } from '../loader.js';
import { resolveProjectRuntimeConfig } from '../resolver.js';

export const resolveBrowserRouteRuntime = ({
  state,
  projectId,
  routeKey
}: {
  state: ConfigCenterState;
  projectId: string;
  routeKey: string;
}) => {
  const runtime = resolveProjectRuntimeConfig({ state, projectId });
  const route = runtime.routes[routeKey];

  if (!route?.browser) {
    throw new Error(`route ${routeKey} does not define a browser runtime`);
  }

  return route.browser;
};
