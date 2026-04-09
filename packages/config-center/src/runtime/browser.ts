import type { ConfigCenterState } from '../loader.js';
import { loadProjectBinding } from '../loader.js';
import {
  expandPluginDependencyClosure,
  resolvePluginRuntimeById
} from '../resolver.js';
import { validatePluginSelection } from '../validator.js';

export const resolveBrowserRouteRuntime = ({
  state,
  projectId,
  routeKey
}: {
  state: ConfigCenterState;
  projectId: string;
  routeKey: string;
}) => {
  const binding = loadProjectBinding({ repoRoot: state.repoRoot, projectId });
  const route = binding.routes[routeKey];

  if (!route?.browser) {
    throw new Error(`route ${routeKey} does not define a browser runtime`);
  }

  const pluginIds = expandPluginDependencyClosure({
    plugins: state.pluginInstances,
    seedPluginIds: [route.browser]
  });
  const validation = validatePluginSelection({ state, pluginIds });

  if (validation.status === 'invalid') {
    throw new Error(
      `config-center validation failed for ${projectId}: ${validation.errors
        .map((item) => item.message)
        .join('; ')}`
    );
  }

  const browser = resolvePluginRuntimeById({ state, pluginId: route.browser });

  if (browser.type !== 'browser-runtime') {
    throw new Error(`${route.browser} is not a browser-runtime plugin`);
  }

  return browser;
};
