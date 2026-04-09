import type {
  MaskedResolvedPluginRuntime,
  MaskedResolvedRuntimeConfig,
  PluginInstance,
  ResolvedPluginRuntime,
  ResolvedRuntimeConfig
} from '@openfons/contracts';
import type { ConfigCenterState } from './loader.js';
import { loadProjectBinding } from './loader.js';
import { buildMaskedPluginInstanceView } from './masking.js';
import { resolveSecretValue } from './secret-store.js';
import { validateProjectConfig } from './validator.js';

const buildPluginMap = (plugins: PluginInstance[]) =>
  new Map(plugins.map((plugin) => [plugin.id, plugin]));

const resolveRoleValue = <T>(
  value: string | string[],
  resolver: (pluginId: string) => T
) => (Array.isArray(value) ? value.map(resolver) : resolver(value));

const getPluginOrThrow = (plugins: Map<string, PluginInstance>, pluginId: string) => {
  const plugin = plugins.get(pluginId);
  if (!plugin) {
    throw new Error(`unknown plugin ${pluginId}`);
  }
  return plugin;
};

const resolvePluginRaw = ({
  plugin,
  secretRoot
}: {
  plugin: PluginInstance;
  secretRoot: string;
}): ResolvedPluginRuntime => ({
  pluginId: plugin.id,
  type: plugin.type,
  driver: plugin.driver,
  config: plugin.config,
  secrets: Object.fromEntries(
    Object.entries(plugin.secrets).map(([field, ref]) => {
      const resolved = resolveSecretValue({ secretRoot, ref });

      return [
        field,
        {
          valueSource: 'secret',
          configured: true,
          value: resolved.value
        }
      ];
    })
  )
});

export const expandPluginDependencyClosure = ({
  plugins,
  seedPluginIds
}: {
  plugins: PluginInstance[];
  seedPluginIds: string[];
}) => {
  const byId = buildPluginMap(plugins);
  const ordered: string[] = [];
  const visited = new Set<string>();

  const visit = (pluginId: string) => {
    if (visited.has(pluginId)) {
      return;
    }

    visited.add(pluginId);
    ordered.push(pluginId);

    const plugin = byId.get(pluginId);
    if (!plugin) {
      return;
    }

    for (const dependency of plugin.dependencies) {
      visit(dependency.pluginId);
    }
  };

  for (const pluginId of seedPluginIds) {
    visit(pluginId);
  }

  return ordered;
};

export const resolvePluginRuntimeById = ({
  state,
  pluginId
}: {
  state: ConfigCenterState;
  pluginId: string;
}) =>
  resolvePluginRaw({
    plugin: getPluginOrThrow(buildPluginMap(state.pluginInstances), pluginId),
    secretRoot: state.secretRoot
  });

export const resolveProjectRuntimeConfig = ({
  state,
  projectId
}: {
  state: ConfigCenterState;
  projectId: string;
}): ResolvedRuntimeConfig => {
  const validation = validateProjectConfig({ state, projectId });
  if (validation.status === 'invalid') {
    throw new Error(
      `config-center validation failed for ${projectId}: ${validation.errors
        .map((item) => item.message)
        .join('; ')}`
    );
  }

  const binding = loadProjectBinding({ repoRoot: state.repoRoot, projectId });
  const plugins = buildPluginMap(state.pluginInstances);
  const byId = (pluginId: string) =>
    resolvePluginRaw({
      plugin: getPluginOrThrow(plugins, pluginId),
      secretRoot: state.secretRoot
    });

  return {
    projectId,
    roles: Object.fromEntries(
      Object.entries(binding.roles).map(([role, value]) => [
        role,
        resolveRoleValue(value, byId)
      ])
    ),
    routes: Object.fromEntries(
      Object.entries(binding.routes).map(([routeKey, route]) => [
        routeKey,
        {
          mode: route.mode,
          discovery: route.discovery?.map(byId),
          browser: route.browser ? byId(route.browser) : undefined,
          collection: route.collection ? byId(route.collection) : undefined,
          accounts: route.accounts?.map(byId),
          cookies: route.cookies?.map(byId),
          proxy: route.proxy ? byId(route.proxy) : undefined
        }
      ])
    )
  };
};

export const resolveMaskedProjectRuntimeConfig = ({
  state,
  projectId
}: {
  state: ConfigCenterState;
  projectId: string;
}): MaskedResolvedRuntimeConfig => {
  const binding = loadProjectBinding({ repoRoot: state.repoRoot, projectId });
  const plugins = buildPluginMap(state.pluginInstances);
  const byId = (pluginId: string): MaskedResolvedPluginRuntime =>
    buildMaskedPluginInstanceView({
      plugin: getPluginOrThrow(plugins, pluginId),
      secretRoot: state.secretRoot
    });

  return {
    projectId,
    roles: Object.fromEntries(
      Object.entries(binding.roles).map(([role, value]) => [
        role,
        resolveRoleValue(value, byId)
      ])
    ),
    routes: Object.fromEntries(
      Object.entries(binding.routes).map(([routeKey, route]) => [
        routeKey,
        {
          mode: route.mode,
          discovery: route.discovery?.map(byId),
          browser: route.browser ? byId(route.browser) : undefined,
          collection: route.collection ? byId(route.collection) : undefined,
          accounts: route.accounts?.map(byId),
          cookies: route.cookies?.map(byId),
          proxy: route.proxy ? byId(route.proxy) : undefined
        }
      ])
    )
  };
};
