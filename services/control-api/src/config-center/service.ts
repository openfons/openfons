import fs from 'node:fs';
import path from 'node:path';
import type {
  CrawlerRoutePreflightReport,
  ConfigBackupHistoryEntry,
  ConfigDoctorReport,
  ConfigValidationResult,
  ConfigWriteResult,
  MaskedResolvedPluginRuntime,
  PluginInstance,
  PluginType,
  ProjectBinding,
  RepoConfigRevision
} from '@openfons/contracts';
import {
  applyPluginInstanceWrite,
  applyProjectBindingWrite,
  buildMaskedPluginInstanceView,
  createProjectConfigDoctorReport,
  getPluginType,
  listConfigBackupHistoryEntries,
  listPluginTypes,
  loadConfigCenterState,
  listPluginInstanceRecords,
  loadProjectBindingRecord,
  resolveMaskedProjectRuntimeConfig,
  validateProjectConfig
} from '@openfons/config-center';
import { createCrawlerRoutePreflightReport } from '../collection/crawler-execution/preflight.js';

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
  listPlugins: () => Array<{
    plugin: MaskedResolvedPluginRuntime;
    revision: RepoConfigRevision;
  }>;
  getPlugin: (pluginId: string) => {
    plugin: PluginInstance;
    revision: RepoConfigRevision;
  } | undefined;
  getProjectBindings: (projectId: string) => {
    binding: ProjectBinding;
    revision: RepoConfigRevision;
  };
  writePlugin: (args: {
    projectId: string;
    pluginId: string;
    expectedRevision?: string;
    dryRun: boolean;
    plugin: PluginInstance;
  }) => Promise<ConfigWriteResult>;
  writeProjectBindings: (args: {
    projectId: string;
    expectedRevision?: string;
    dryRun: boolean;
    binding: ProjectBinding;
  }) => Promise<ConfigWriteResult>;
  listBackupHistory: (args: {
    resource?: string;
    resourceId?: string;
    projectId?: string;
  }) => ConfigBackupHistoryEntry[];
  validateAll: () => {
    projects: Array<{
      projectId: string;
      validation: ConfigValidationResult;
    }>;
  };
  getProjectValidation: (projectId: string) => ConfigValidationResult;
  getCrawlerRoutePreflight: (args: {
    projectId: string;
    routeKey: string;
  }) => CrawlerRoutePreflightReport;
  getProjectDoctor: (projectId: string) => ConfigDoctorReport;
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
      return listPluginInstanceRecords({ repoRoot }).map((record) => ({
        plugin: buildMaskedPluginInstanceView({
          plugin: record.plugin,
          secretRoot: state.secretRoot
        }),
        revision: record.revision
      }));
    },
    getPlugin: (pluginId) => {
      const state = loadState();
      const record = listPluginInstanceRecords({ repoRoot }).find(
        (item) => item.plugin.id === pluginId
      );

      return record
        ? {
            plugin: record.plugin,
            revision: record.revision
          }
        : undefined;
    },
    getProjectBindings: (projectId) => {
      const record = loadProjectBindingRecord({ repoRoot, projectId });
      return {
        binding: record.binding,
        revision: record.revision
      };
    },
    writePlugin: ({ projectId, pluginId, expectedRevision, dryRun, plugin }) =>
      applyPluginInstanceWrite({
        repoRoot,
        secretRoot,
        projectId,
        expectedRevision,
        dryRun,
        plugin: { ...plugin, id: pluginId }
      }),
    writeProjectBindings: ({ projectId, expectedRevision, dryRun, binding }) =>
      applyProjectBindingWrite({
        repoRoot,
        secretRoot,
        projectId,
        expectedRevision,
        dryRun,
        binding: { ...binding, projectId }
      }),
    listBackupHistory: ({ resource, resourceId, projectId }) =>
      listConfigBackupHistoryEntries({
        repoRoot,
        resource,
        resourceId,
        projectId
      }),
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
    getCrawlerRoutePreflight: ({ projectId, routeKey }) =>
      createCrawlerRoutePreflightReport({
        projectId,
        routeKey,
        repoRoot,
        secretRoot
      }),
    getProjectDoctor: (projectId) => {
      const binding = loadProjectBindingRecord({ repoRoot, projectId }).binding;
      const routes = Object.entries(binding.routes).map(([routeKey, route]) => {
        const preflight = createCrawlerRoutePreflightReport({
          projectId,
          routeKey,
          repoRoot,
          secretRoot
        });
        const hasPlaceholder = [
          ...preflight.hostChecks,
          ...preflight.secretChecks
        ].some((item) => item.status === 'placeholder');

        return {
          routeKey,
          mode: route.mode,
          status:
            preflight.status === 'ready'
              ? 'ready'
              : hasPlaceholder
                ? 'degraded'
                : 'blocked',
          reason:
            preflight.status === 'ready'
              ? 'all required runtime inputs are configured'
              : preflight.nextSteps[0] ?? 'route preflight reported blockers'
        } as const;
      });

      return createProjectConfigDoctorReport({
        repoRoot,
        secretRoot,
        projectId,
        routes
      });
    },
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
