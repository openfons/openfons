import type { ResolvedPluginRuntime } from '@openfons/contracts';
import type { ConfigCenterState } from '../loader.js';
import { resolveProjectRuntimeConfig } from '../resolver.js';

const asArray = <T>(value: T | T[] | undefined) =>
  !value ? [] : Array.isArray(value) ? value : [value];

export const resolveSearchRuntime = ({
  state,
  projectId
}: {
  state: ConfigCenterState;
  projectId: string;
}) => {
  const runtime = resolveProjectRuntimeConfig({ state, projectId });
  const providers = [
    ...asArray(runtime.roles.primarySearch as ResolvedPluginRuntime | ResolvedPluginRuntime[] | undefined),
    ...asArray(runtime.roles.fallbackSearch as ResolvedPluginRuntime | ResolvedPluginRuntime[] | undefined),
    ...Object.values(runtime.routes).flatMap((route) => route.discovery ?? [])
  ].filter(
    (plugin, index, items) =>
      items.findIndex((candidate) => candidate.pluginId === plugin.pluginId) === index
  );

  return { providers };
};
