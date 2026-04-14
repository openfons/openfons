import type {
  ResolvedPluginRuntime,
  SourceReadiness
} from '@openfons/contracts';
import type { ConfigCenterState } from '../loader.js';
import { loadProjectBinding } from '../loader.js';
import {
  expandPluginDependencyClosure,
  resolvePluginRuntimeById
} from '../resolver.js';
import { validatePluginSelection } from '../validator.js';
import { buildProjectReadiness } from '../readiness.js';

const asArray = <T>(value: T | T[] | undefined) =>
  !value ? [] : Array.isArray(value) ? value : [value];

const unique = <T>(items: T[]) =>
  items.filter((item, index) => items.indexOf(item) === index);

const collectSearchProviderIds = ({
  state,
  projectId
}: {
  state: ConfigCenterState;
  projectId: string;
}) => {
  const binding = loadProjectBinding({ repoRoot: state.repoRoot, projectId });

  return unique([
    ...asArray(binding.roles.primarySearch),
    ...asArray(binding.roles.fallbackSearch),
    ...Object.values(binding.routes).flatMap((route) => route.discovery ?? [])
  ]);
};

export const resolveSearchRuntime = ({
  state,
  projectId
}: {
  state: ConfigCenterState;
  projectId: string;
}) => {
  const providerIds = collectSearchProviderIds({ state, projectId });
  const pluginIds = expandPluginDependencyClosure({
    plugins: state.pluginInstances,
    seedPluginIds: providerIds
  });
  const validation = validatePluginSelection({ state, pluginIds });

  if (validation.status === 'invalid') {
    throw new Error(
      `config-center validation failed for ${projectId}: ${validation.errors
        .map((item) => item.message)
        .join('; ')}`
    );
  }

  const providers = providerIds.map(
    (pluginId): ResolvedPluginRuntime => {
      const plugin = resolvePluginRuntimeById({ state, pluginId });

      if (plugin.type !== 'search-provider') {
        throw new Error(`${pluginId} is not a search-provider plugin`);
      }

      return plugin;
    }
  );

  return { providers };
};

export const resolveSearchSourceReadiness = ({
  state,
  projectId
}: {
  state: ConfigCenterState;
  projectId: string;
}): SourceReadiness => {
  const report = buildProjectReadiness({
    repoRoot: state.repoRoot,
    secretRoot: state.secretRoot,
    projectId
  });
  const searchSource = report.sources.find((source) => source.sourceId === 'search');

  if (!searchSource) {
    throw new Error(`search readiness not found for ${projectId}`);
  }

  return searchSource;
};
