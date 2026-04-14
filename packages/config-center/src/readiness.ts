import {
  ProjectReadinessReportSchema,
  type ConfigValidationResult,
  type ProjectBinding,
  type ProjectReadinessReport,
  type ProjectRouteBinding,
  type RouteReadiness,
  type SourceReadiness
} from '@openfons/contracts';
import { loadConfigCenterState, loadProjectBinding } from './loader.js';
import { expandPluginDependencyClosure } from './resolver.js';
import { getPluginSpec } from './spec-registry.js';
import { validatePluginSelection } from './validator.js';

const asArray = <T>(value: T | T[] | undefined) =>
  !value ? [] : Array.isArray(value) ? value : [value];

const unique = <T>(items: T[]) =>
  items.filter((item, index) => items.indexOf(item) === index);

const toNote = (code: string, message: string) => ({ code, message });

const toRouteStatus = (
  status: ConfigValidationResult['status']
): RouteReadiness['status'] => {
  switch (status) {
    case 'valid':
      return 'ready';
    case 'degraded':
      return 'degraded';
    default:
      return 'blocked';
  }
};

const aggregateSourceStatus = (
  routes: RouteReadiness[]
): SourceReadiness['status'] => {
  if (
    routes.some(
      (route) => route.qualityTier === 'primary' && route.status === 'ready'
    )
  ) {
    return 'ready';
  }
  if (routes.some((route) => route.status !== 'blocked')) {
    return 'degraded';
  }
  return 'blocked';
};

const buildSourceSummary = ({
  sourceId,
  status
}: {
  sourceId: string;
  status: SourceReadiness['status'];
}) => {
  switch (status) {
    case 'ready':
      return `${sourceId} has at least one ready route`;
    case 'degraded':
      return `${sourceId} has degraded routes but remains usable`;
    default:
      return `${sourceId} is blocked by missing configuration or secrets`;
  }
};

const collectSearchPluginIds = (binding: ProjectBinding) =>
  unique([
    ...asArray(binding.roles.primarySearch),
    ...asArray(binding.roles.fallbackSearch),
    ...Object.values(binding.routes).flatMap((route) => route.discovery ?? [])
  ]);

const collectRoutePluginIds = (route: ProjectRouteBinding) =>
  unique([
    ...(route.discovery ?? []),
    ...(route.browser ? [route.browser] : []),
    ...(route.collection ? [route.collection] : []),
    ...(route.accounts ?? []),
    ...(route.cookies ?? []),
    ...(route.proxy ? [route.proxy] : [])
  ]);

const buildSearchRouteReadiness = ({
  binding,
  pluginId,
  allPluginInstances,
  repoRoot,
  secretRoot
}: {
  binding: ProjectBinding;
  pluginId: string;
  allPluginInstances: ReturnType<typeof loadConfigCenterState>['pluginInstances'];
  repoRoot: string;
  secretRoot: string;
}): RouteReadiness => {
  const plugin = allPluginInstances.find((item) => item.id === pluginId);
  const pluginIds = expandPluginDependencyClosure({
    plugins: allPluginInstances,
    seedPluginIds: [pluginId]
  });
  const validation = validatePluginSelection({
    state: {
      repoRoot,
      secretRoot,
      pluginInstances: allPluginInstances
    },
    pluginIds
  });
  const primaryIds = new Set(asArray(binding.roles.primarySearch));
  const fallbackIds = new Set(asArray(binding.roles.fallbackSearch));
  const spec = plugin ? getPluginSpec(plugin.type, plugin.driver) : undefined;

  return {
    sourceId: 'search',
    routeKey: plugin?.driver ?? pluginId,
    status: toRouteStatus(validation.status),
    qualityTier: primaryIds.has(pluginId)
      ? 'primary'
      : fallbackIds.has(pluginId)
        ? 'fallback'
        : 'supplemental',
    requirements: [
      ...((spec?.requiredConfigFields ?? []).map((field) =>
        toNote(`config:${field}`, `${pluginId} requires config.${field}`)
      )),
      ...((spec?.secretFields ?? []).map((field) =>
        toNote(`secret:${field}`, `${pluginId} requires secret ${field}`)
      ))
    ],
    blockers: validation.errors.map((issue) => toNote(issue.code, issue.message)),
    warnings: validation.warnings.map((issue) => toNote(issue.code, issue.message)),
    detail: {
      pluginId,
      closure: pluginIds
    }
  };
};

const buildCrawlerSourceReadiness = ({
  routeKey,
  route,
  allPluginInstances,
  repoRoot,
  secretRoot,
  updatedAt
}: {
  routeKey: string;
  route: ProjectRouteBinding;
  allPluginInstances: ReturnType<typeof loadConfigCenterState>['pluginInstances'];
  repoRoot: string;
  secretRoot: string;
  updatedAt: string;
}): SourceReadiness => {
  const seedPluginIds = collectRoutePluginIds(route);
  const pluginIds = expandPluginDependencyClosure({
    plugins: allPluginInstances,
    seedPluginIds
  });
  const validation = validatePluginSelection({
    state: {
      repoRoot,
      secretRoot,
      pluginInstances: allPluginInstances
    },
    pluginIds
  });
  const routeReadiness: RouteReadiness = {
    sourceId: routeKey,
    routeKey,
    status: toRouteStatus(validation.status),
    qualityTier: 'primary',
    requirements: pluginIds.map((pluginId) =>
      toNote(`plugin:${pluginId}`, `${routeKey} requires plugin ${pluginId}`)
    ),
    blockers: validation.errors.map((issue) => toNote(issue.code, issue.message)),
    warnings: validation.warnings.map((issue) => toNote(issue.code, issue.message)),
    detail: {
      mode: route.mode,
      closure: pluginIds
    }
  };
  const status = aggregateSourceStatus([routeReadiness]);

  return {
    sourceId: routeKey,
    status,
    routes: [routeReadiness],
    summary: buildSourceSummary({ sourceId: routeKey, status }),
    updatedAt
  };
};

const buildUnconfiguredSearchRoute = (): RouteReadiness => ({
  sourceId: 'search',
  routeKey: 'unconfigured',
  status: 'blocked',
  qualityTier: 'primary',
  requirements: [
    toNote('config:search-provider', 'search requires at least one configured provider')
  ],
  blockers: [
    toNote('missing_search_provider', 'search has no configured provider plugins')
  ],
  warnings: [],
  detail: {}
});

export const buildProjectReadiness = ({
  repoRoot,
  secretRoot,
  projectId
}: {
  repoRoot: string;
  secretRoot?: string;
  projectId: string;
}): ProjectReadinessReport => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const binding = loadProjectBinding({ repoRoot, projectId });
  const updatedAt = new Date().toISOString();
  const searchRoutes = collectSearchPluginIds(binding).map((pluginId) =>
    buildSearchRouteReadiness({
      binding,
      pluginId,
      allPluginInstances: state.pluginInstances,
      repoRoot,
      secretRoot: state.secretRoot
    })
  );
  const normalizedSearchRoutes =
    searchRoutes.length > 0 ? searchRoutes : [buildUnconfiguredSearchRoute()];
  const searchStatus = aggregateSourceStatus(normalizedSearchRoutes);
  const searchSource: SourceReadiness = {
    sourceId: 'search',
    status: searchStatus,
    routes: normalizedSearchRoutes,
    summary: buildSourceSummary({ sourceId: 'search', status: searchStatus }),
    updatedAt
  };
  const crawlerSources = Object.entries(binding.routes).map(([routeKey, route]) =>
    buildCrawlerSourceReadiness({
      routeKey,
      route,
      allPluginInstances: state.pluginInstances,
      repoRoot,
      secretRoot: state.secretRoot,
      updatedAt
    })
  );

  return ProjectReadinessReportSchema.parse({
    projectId,
    sources: [searchSource, ...crawlerSources]
  });
};
