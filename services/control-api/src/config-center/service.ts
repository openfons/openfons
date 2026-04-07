import fs from 'node:fs';
import path from 'node:path';
import type {
  ConfigValidationResult,
  MaskedResolvedPluginRuntime,
  PluginType,
  ProjectBinding
} from '@openfons/contracts';
import {
  buildMaskedPluginInstanceView,
  getPluginType,
  listPluginTypes,
  loadConfigCenterState,
  loadProjectBinding,
  resolveMaskedProjectRuntimeConfig,
  validateProjectConfig
} from '@openfons/config-center';

const flattenRuntimePlugins = (
  projectRuntime: ReturnType<typeof resolveMaskedProjectRuntimeConfig>
) => [
  ...Object.values(projectRuntime.roles).flatMap((value) =>
    Array.isArray(value) ? value : [value]
  ),
  ...Object.values(projectRuntime.routes).flatMap((route) => [
    ...(route.discovery ?? []),
    ...(route.browser ? [route.browser] : []),
    ...(route.collection ? [route.collection] : []),
    ...(route.accounts ?? []),
    ...(route.cookies ?? []),
    ...(route.proxy ? [route.proxy] : [])
  ])
];

export type ConfigCenterService = {
  listPluginTypes: () => PluginType[];
  getPluginType: (typeId: string) => PluginType | undefined;
  listPlugins: () => MaskedResolvedPluginRuntime[];
  getPlugin: (pluginId: string) => MaskedResolvedPluginRuntime | undefined;
  getProjectBindings: (projectId: string) => ProjectBinding;
  validateAll: () => {
    projects: Array<{
      projectId: string;
      validation: ConfigValidationResult;
    }>;
  };
  getProjectValidation: (projectId: string) => ConfigValidationResult;
  resolveProject: (
    projectId: string
  ) => ReturnType<typeof resolveMaskedProjectRuntimeConfig>;
  resolvePlugin: (args: {
    projectId: string;
    pluginId: string;
  }) => MaskedResolvedPluginRuntime | undefined;
};

export const createConfigCenterService = ({
  repoRoot,
  secretRoot
}: {
  repoRoot: string;
  secretRoot?: string;
}): ConfigCenterService => {
  const loadState = () => loadConfigCenterState({ repoRoot, secretRoot });

  const listProjectIds = () =>
    fs
      .readdirSync(path.join(repoRoot, 'config', 'projects'))
      .filter((name) =>
        fs.existsSync(
          path.join(repoRoot, 'config', 'projects', name, 'plugins', 'bindings.json')
        )
      )
      .sort();

  return {
    listPluginTypes,
    getPluginType: (typeId) => getPluginType(typeId as PluginType['id']),
    listPlugins: () => {
      const state = loadState();
      return state.pluginInstances.map((plugin) =>
        buildMaskedPluginInstanceView({ plugin, secretRoot: state.secretRoot })
      );
    },
    getPlugin: (pluginId) => {
      const state = loadState();
      const plugin = state.pluginInstances.find((item) => item.id === pluginId);

      return plugin
        ? buildMaskedPluginInstanceView({ plugin, secretRoot: state.secretRoot })
        : undefined;
    },
    getProjectBindings: (projectId) => loadProjectBinding({ repoRoot, projectId }),
    validateAll: () => {
      const state = loadState();
      return {
        projects: listProjectIds().map((projectId) => ({
          projectId,
          validation: validateProjectConfig({ state, projectId })
        }))
      };
    },
    getProjectValidation: (projectId) =>
      validateProjectConfig({ state: loadState(), projectId }),
    resolveProject: (projectId) =>
      resolveMaskedProjectRuntimeConfig({ state: loadState(), projectId }),
    resolvePlugin: ({ projectId, pluginId }) =>
      flattenRuntimePlugins(
        resolveMaskedProjectRuntimeConfig({ state: loadState(), projectId })
      ).find(
        (plugin: MaskedResolvedPluginRuntime) => plugin.pluginId === pluginId
      )
  };
};
