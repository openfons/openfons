import {
  loadConfigCenterState,
  resolveBrowserRouteRuntime,
  resolveMaskedProjectRuntimeConfig
} from '@openfons/config-center';

export const resolveConfiguredBrowserRuntime = ({
  projectId,
  routeKey,
  repoRoot,
  secretRoot
}: {
  projectId: string;
  routeKey: string;
  repoRoot: string;
  secretRoot?: string;
}) => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  return resolveBrowserRouteRuntime({ state, projectId, routeKey });
};

export const describeConfiguredBrowserRuntime = ({
  projectId,
  routeKey,
  repoRoot,
  secretRoot
}: {
  projectId: string;
  routeKey: string;
  repoRoot: string;
  secretRoot?: string;
}) => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const runtime = resolveMaskedProjectRuntimeConfig({ state, projectId });
  return runtime.routes[routeKey]?.browser;
};
