import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type {
  CrawlerRoutePreflightReport,
  CrawlerRouteSummary,
  PluginInstance,
  RuntimeBootstrapAction,
  RuntimePreflightCheck,
  SecretRef
} from '@openfons/contracts';
import { CrawlerRoutePreflightReportSchema } from '@openfons/contracts';
import {
  expandPluginDependencyClosure,
  getPluginSpec,
  loadConfigCenterState,
  loadProjectBinding,
  resolveSecretValue
} from '@openfons/config-center';

type CommandExists = (command: string) => boolean;
type EnvUvPythonExists = (repoRoot: string) => boolean;

export type CrawlerRoutePreflightOptions = {
  projectId: string;
  routeKey: string;
  repoRoot: string;
  secretRoot?: string;
  env?: NodeJS.ProcessEnv;
  commandExists?: CommandExists;
  envUvPythonExists?: EnvUvPythonExists;
};

export type BootstrapCrawlerRoutePreflightOptions =
  CrawlerRoutePreflightOptions & {
    runUvSync?: (() => RuntimeBootstrapAction | Promise<RuntimeBootstrapAction>) | undefined;
  };

type PreflightContext = {
  projectId: string;
  routeKey: string;
  repoRoot: string;
  secretRoot: string;
  env: NodeJS.ProcessEnv;
  routeSummary: CrawlerRouteSummary | null;
  routePluginIds: string[];
  pluginsById: Map<string, PluginInstance>;
  commandExists: CommandExists;
  envUvPythonExists: EnvUvPythonExists;
};

type SecretEvaluation = {
  status: RuntimePreflightCheck['status'];
  message: string;
};

const PINCHTAB_TOKEN_PLACEHOLDER = 'REPLACE_WITH_PINCHTAB_TOKEN';
const ACCOUNT_PLACEHOLDER = 'REPLACE_ME';
const COOKIE_PLACEHOLDER =
  'REPLACE_WITH_NETSCAPE_COOKIE_FILE_CONTAINING_MS_TOKEN';
const PROXY_PLACEHOLDER = 'REPLACE_ME';
const UV_COMMAND_CANDIDATES = ['uv', 'uv.exe'] as const;
const YT_DLP_COMMAND_CANDIDATES = ['yt-dlp', 'yt-dlp.exe'] as const;

const defaultCommandExists: CommandExists = (command) => {
  if (command.includes('\\') || command.includes('/')) {
    return existsSync(command);
  }

  const probe = spawnSync(process.platform === 'win32' ? 'where' : 'which', [command], {
    encoding: 'utf8',
    windowsHide: true
  });

  return probe.status === 0;
};

const defaultEnvUvPythonExists: EnvUvPythonExists = (repoRoot) =>
  existsSync(resolveEnvUvPythonPath(repoRoot));

const resolveEnvUvPythonPath = (repoRoot: string) =>
  process.platform === 'win32'
    ? path.join(repoRoot, '.env_uv', 'Scripts', 'python.exe')
    : path.join(repoRoot, '.env_uv', 'bin', 'python');

const resolveBridgeScriptPath = (repoRoot: string) =>
  path.join(
    repoRoot,
    'services',
    'control-api',
    'scripts',
    'crawlers',
    'tiktok_api_capture.py'
  );

const resolvePyprojectPath = (repoRoot: string) =>
  path.join(repoRoot, 'pyproject.toml');

const toUniqueList = (values: Array<string | undefined>) =>
  [...new Set(values.filter((value): value is string => Boolean(value)))];

const getCommandCandidates = ({
  env,
  kind
}: {
  env: NodeJS.ProcessEnv;
  kind: 'yt-dlp' | 'uv';
}) =>
  kind === 'yt-dlp'
    ? toUniqueList([env.OPENFONS_YT_DLP_PATH, ...YT_DLP_COMMAND_CANDIDATES])
    : toUniqueList([env.OPENFONS_UV_PATH, ...UV_COMMAND_CANDIDATES]);

const candidateSecretPaths = ({
  secretRoot,
  ref
}: {
  secretRoot: string;
  ref: SecretRef;
}) => {
  const basePath =
    ref.scope === 'project'
      ? path.join(secretRoot, 'project', ref.projectId as string, ref.name)
      : path.join(secretRoot, 'global', ref.name);

  return [basePath, `${basePath}.txt`, `${basePath}.json`];
};

const getExistingCandidatePath = (candidatePaths: string[]) =>
  candidatePaths.find((candidate) => existsSync(candidate));

const evaluateTokenSecret = (
  pluginId: string,
  field: string,
  value: unknown
): SecretEvaluation => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {
      status: 'invalid',
      message: `${pluginId} secret ${field} must be a non-empty string`
    };
  }

  if (value.trim() === PINCHTAB_TOKEN_PLACEHOLDER) {
    return {
      status: 'placeholder',
      message: `${pluginId} secret ${field} still contains the placeholder token`
    };
  }

  return {
    status: 'ok',
    message: `${pluginId} secret ${field} is configured`
  };
};

const evaluateAccountSecret = (
  pluginId: string,
  field: string,
  value: unknown
): SecretEvaluation => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      status: 'invalid',
      message: `${pluginId} secret ${field} must be a JSON object`
    };
  }

  const account = value as {
    username?: unknown;
    password?: unknown;
  };

  if (
    typeof account.username !== 'string' ||
    account.username.trim().length === 0 ||
    typeof account.password !== 'string' ||
    account.password.trim().length === 0
  ) {
    return {
      status: 'invalid',
      message: `${pluginId} secret ${field} must include username and password`
    };
  }

  if (JSON.stringify(account).includes(ACCOUNT_PLACEHOLDER)) {
    return {
      status: 'placeholder',
      message: `${pluginId} secret ${field} still contains placeholder credentials`
    };
  }

  return {
    status: 'ok',
    message: `${pluginId} secret ${field} is configured`
  };
};

const evaluateCookieSecret = (
  pluginId: string,
  field: string,
  value: unknown
): SecretEvaluation => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {
      status: 'invalid',
      message: `${pluginId} secret ${field} must be a Netscape cookie string`
    };
  }

  const normalized = value.trim();

  if (normalized === COOKIE_PLACEHOLDER) {
    return {
      status: 'placeholder',
      message: `${pluginId} secret ${field} still contains the placeholder cookie file`
    };
  }

  if (!/(ms_token|msToken)/.test(normalized)) {
    return {
      status: 'invalid',
      message: `${pluginId} secret ${field} must contain an ms_token or msToken marker`
    };
  }

  return {
    status: 'ok',
    message: `${pluginId} secret ${field} is configured`
  };
};

const evaluateProxySecret = (
  pluginId: string,
  field: string,
  value: unknown
): SecretEvaluation => {
  if (!Array.isArray(value)) {
    return {
      status: 'invalid',
      message: `${pluginId} secret ${field} must be a JSON array`
    };
  }

  const endpoints = value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const endpoint = (item as { endpoint?: unknown }).endpoint;
    return typeof endpoint === 'string' && endpoint.trim().length > 0
      ? [endpoint.trim()]
      : [];
  });

  if (endpoints.length === 0) {
    return {
      status: 'invalid',
      message: `${pluginId} secret ${field} must contain at least one proxy endpoint`
    };
  }

  if (endpoints.some((endpoint) => endpoint.includes(PROXY_PLACEHOLDER))) {
    return {
      status: 'placeholder',
      message: `${pluginId} secret ${field} still contains placeholder proxy endpoints`
    };
  }

  return {
    status: 'ok',
    message: `${pluginId} secret ${field} is configured`
  };
};

const evaluateSecretValue = ({
  plugin,
  field,
  value
}: {
  plugin: PluginInstance;
  field: string;
  value: unknown;
}): SecretEvaluation => {
  if (field === 'tokenRef') {
    return evaluateTokenSecret(plugin.id, field, value);
  }

  if (field === 'accountRef') {
    return evaluateAccountSecret(plugin.id, field, value);
  }

  if (field === 'sessionRef') {
    return evaluateCookieSecret(plugin.id, field, value);
  }

  if (field === 'poolRef') {
    return evaluateProxySecret(plugin.id, field, value);
  }

  return {
    status: 'ok',
    message: `${plugin.id} secret ${field} is configured`
  };
};

const buildRouteSummary = ({
  routeKey,
  pluginsById,
  binding
}: {
  routeKey: string;
  pluginsById: Map<string, PluginInstance>;
  binding: ReturnType<typeof loadProjectBinding>;
}): CrawlerRouteSummary | null => {
  const route = binding.routes[routeKey];

  if (!route?.collection) {
    return null;
  }

  const collection = pluginsById.get(route.collection);

  if (!collection) {
    return null;
  }

  return {
    routeKey,
    mode: route.mode,
    driver: collection.driver,
    collectionPluginId: collection.id
  };
};

const loadPreflightContext = (
  options: CrawlerRoutePreflightOptions
): PreflightContext => {
  const env = options.env ?? process.env;
  const commandExists = options.commandExists ?? defaultCommandExists;
  const envUvPythonExists =
    options.envUvPythonExists ?? defaultEnvUvPythonExists;
  const state = loadConfigCenterState({
    repoRoot: options.repoRoot,
    secretRoot: options.secretRoot
  });
  const binding = loadProjectBinding({
    repoRoot: options.repoRoot,
    projectId: options.projectId
  });
  const route = binding.routes[options.routeKey];
  const routePluginIds = route
    ? expandPluginDependencyClosure({
        plugins: state.pluginInstances,
        seedPluginIds: [
          route.collection,
          route.browser,
          ...(route.accounts ?? []),
          ...(route.cookies ?? []),
          route.proxy
        ].filter((value): value is string => Boolean(value))
      })
    : [];
  const pluginsById = new Map(
    state.pluginInstances.map((plugin) => [plugin.id, plugin])
  );

  return {
    projectId: options.projectId,
    routeKey: options.routeKey,
    repoRoot: options.repoRoot,
    secretRoot: state.secretRoot,
    env,
    routeSummary: buildRouteSummary({
      routeKey: options.routeKey,
      pluginsById,
      binding
    }),
    routePluginIds,
    pluginsById,
    commandExists,
    envUvPythonExists
  };
};

const buildHostChecks = (context: PreflightContext): RuntimePreflightCheck[] => {
  if (!context.routeSummary) {
    return [
      {
        key: 'missing-route',
        label: `route ${context.routeKey}`,
        status: 'missing',
        message: `route ${context.routeKey} is not defined for project ${context.projectId}`,
        candidatePaths: []
      }
    ];
  }

  if (context.routeSummary.driver === 'yt-dlp') {
    const candidates = getCommandCandidates({
      env: context.env,
      kind: 'yt-dlp'
    });
    const selected = candidates.find((candidate) =>
      context.commandExists(candidate)
    );

    return [
      {
        key: 'yt-dlp',
        label: 'yt-dlp command',
        status: selected ? 'ok' : 'missing',
        message: selected
          ? `yt-dlp is available via ${selected}`
          : 'yt-dlp was not found on PATH and OPENFONS_YT_DLP_PATH is not set',
        command: selected ?? 'yt-dlp',
        envVar: 'OPENFONS_YT_DLP_PATH',
        candidatePaths: candidates
      }
    ];
  }

  if (context.routeSummary.driver === 'tiktok-api') {
    const uvCandidates = getCommandCandidates({
      env: context.env,
      kind: 'uv'
    });
    const selectedUv = uvCandidates.find((candidate) =>
      context.commandExists(candidate)
    );
    const pyprojectPath = resolvePyprojectPath(context.repoRoot);
    const envPythonPath = resolveEnvUvPythonPath(context.repoRoot);
    const bridgeScriptPath = resolveBridgeScriptPath(context.repoRoot);

    return [
      {
        key: 'uv',
        label: 'uv command',
        status: selectedUv ? 'ok' : 'missing',
        message: selectedUv
          ? `uv is available via ${selectedUv}`
          : 'uv was not found on PATH and OPENFONS_UV_PATH is not set',
        command: selectedUv ?? 'uv',
        envVar: 'OPENFONS_UV_PATH',
        candidatePaths: uvCandidates
      },
      {
        key: '.env_uv-python',
        label: '.env_uv python',
        status: context.envUvPythonExists(context.repoRoot) ? 'ok' : 'missing',
        message: context.envUvPythonExists(context.repoRoot)
          ? '.env_uv python executable is present'
          : '.env_uv python executable is missing',
        filePath: envPythonPath,
        candidatePaths: [envPythonPath]
      },
      {
        key: 'pyproject.toml',
        label: 'pyproject.toml',
        status: existsSync(pyprojectPath) ? 'ok' : 'missing',
        message: existsSync(pyprojectPath)
          ? 'pyproject.toml is present'
          : 'pyproject.toml is missing',
        filePath: pyprojectPath,
        candidatePaths: [pyprojectPath]
      },
      {
        key: 'tiktok-api-bridge',
        label: 'TikTok bridge script',
        status: existsSync(bridgeScriptPath) ? 'ok' : 'missing',
        message: existsSync(bridgeScriptPath)
          ? 'TikTok bridge script is present'
          : 'TikTok bridge script is missing',
        filePath: bridgeScriptPath,
        candidatePaths: [bridgeScriptPath]
      }
    ];
  }

  return [];
};

const buildSecretChecks = (
  context: PreflightContext
): RuntimePreflightCheck[] =>
  context.routePluginIds.flatMap((pluginId) => {
    const plugin = context.pluginsById.get(pluginId);

    if (!plugin) {
      return [];
    }

    const spec = getPluginSpec(plugin.type, plugin.driver);

    if (!spec || spec.secretFields.length === 0) {
      return [];
    }

    return spec.secretFields.map((field) => {
      const ref = plugin.secrets[field];

      if (!ref) {
        return {
          key: `${plugin.id}:${field}`,
          label: `${plugin.id} ${field}`,
          status: 'missing' as const,
          message: `${plugin.id} requires ${field}`,
          pluginId: plugin.id,
          field,
          candidatePaths: []
        };
      }

      const paths = candidateSecretPaths({
        secretRoot: context.secretRoot,
        ref
      });

      try {
        const resolved = resolveSecretValue({
          secretRoot: context.secretRoot,
          ref
        });

        if (!resolved.configured) {
          return {
            key: ref.name,
            label: ref.name,
            status: 'missing' as const,
            message: `${plugin.id} secret ${field} was not found`,
            filePath: undefined,
            candidatePaths: paths,
            pluginId: plugin.id,
            field
          };
        }

        const evaluation = evaluateSecretValue({
          plugin,
          field,
          value: resolved.value
        });

        return {
          key: ref.name,
          label: ref.name,
          status: evaluation.status,
          message: evaluation.message,
          filePath: resolved.filePath,
          candidatePaths: paths,
          pluginId: plugin.id,
          field
        };
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);

        return {
          key: ref.name,
          label: ref.name,
          status: 'invalid' as const,
          message: `${plugin.id} secret ${field} is invalid: ${details}`,
          filePath: getExistingCandidatePath(paths),
          candidatePaths: paths,
          pluginId: plugin.id,
          field
        };
      }
    });
  });

const buildNextSteps = ({
  routeKey,
  status,
  hostChecks,
  secretChecks
}: {
  routeKey: string;
  status: 'ready' | 'blocked';
  hostChecks: RuntimePreflightCheck[];
  secretChecks: RuntimePreflightCheck[];
}) => {
  if (status === 'ready') {
    return [
      `Run pnpm smoke:crawler-execution -- --route ${routeKey} --out docs/workbench/generated/crawler-execution-smoke-${routeKey}.json`
    ];
  }

  const blockers = [...hostChecks, ...secretChecks].filter(
    (item) => item.status !== 'ok'
  );
  const steps = blockers.map((item) => `Fix ${item.label}: ${item.message}`);

  if (secretChecks.some((item) => item.status === 'missing')) {
    steps.push(
      `Create the missing secret files for route ${routeKey} under the configured secret root`
    );
  }

  steps.push(`Re-run crawler runtime preflight for route ${routeKey}`);
  return steps;
};

const buildPlaceholderSecretFile = ({
  ref,
  field,
  secretRoot
}: {
  ref: SecretRef;
  field: string;
  secretRoot: string;
}) => {
  const basePath =
    ref.scope === 'project'
      ? path.join(secretRoot, 'project', ref.projectId as string, ref.name)
      : path.join(secretRoot, 'global', ref.name);

  if (field === 'accountRef') {
    return {
      filePath: `${basePath}.json`,
      contents: JSON.stringify(
        {
          username: ACCOUNT_PLACEHOLDER,
          password: ACCOUNT_PLACEHOLDER
        },
        null,
        2
      )
    };
  }

  if (field === 'poolRef') {
    return {
      filePath: `${basePath}.json`,
      contents: JSON.stringify(
        [{ endpoint: 'http://REPLACE_ME:PORT' }],
        null,
        2
      )
    };
  }

  return {
    filePath: basePath,
    contents:
      field === 'sessionRef' ? COOKIE_PLACEHOLDER : PINCHTAB_TOKEN_PLACEHOLDER
  };
};

const createMissingBootstrapArtifacts = (
  context: PreflightContext
): RuntimeBootstrapAction[] => {
  const actions: RuntimeBootstrapAction[] = [];

  for (const pluginId of context.routePluginIds) {
    const plugin = context.pluginsById.get(pluginId);

    if (!plugin) {
      continue;
    }

    const spec = getPluginSpec(plugin.type, plugin.driver);

    if (!spec) {
      continue;
    }

    for (const field of spec.secretFields) {
      const ref = plugin.secrets[field];

      if (!ref) {
        actions.push({
          key: `${plugin.id}:${field}`,
          status: 'failed',
          message: `${plugin.id} is missing secret ref ${field}`
        });
        continue;
      }

      const candidatePaths = candidateSecretPaths({
        secretRoot: context.secretRoot,
        ref
      });

      if (getExistingCandidatePath(candidatePaths)) {
        const existingPath = getExistingCandidatePath(candidatePaths);

        actions.push({
          key: ref.name,
          status: 'skipped',
          path: existingPath,
          message: `${ref.name} already exists`
        });
        continue;
      }

      const placeholder = buildPlaceholderSecretFile({
        ref,
        field,
        secretRoot: context.secretRoot
      });

      mkdirSync(path.dirname(placeholder.filePath), { recursive: true });
      writeFileSync(placeholder.filePath, placeholder.contents, 'utf8');
      actions.push({
        key: ref.name,
        status: 'created',
        path: placeholder.filePath,
        message: `${ref.name} placeholder file created`
      });
    }
  }

  return actions;
};

export const createCrawlerRoutePreflightReport = (
  options: CrawlerRoutePreflightOptions
): CrawlerRoutePreflightReport => {
  const context = loadPreflightContext(options);
  const hostChecks = buildHostChecks(context);
  const secretChecks = buildSecretChecks(context);
  const status =
    [...hostChecks, ...secretChecks].every((item) => item.status === 'ok')
      ? 'ready'
      : 'blocked';

  return CrawlerRoutePreflightReportSchema.parse({
    projectId: context.projectId,
    routeKey: context.routeKey,
    secretRoot: context.secretRoot,
    status,
    route: context.routeSummary,
    hostChecks,
    secretChecks,
    bootstrapActions: [],
    nextSteps: buildNextSteps({
      routeKey: context.routeKey,
      status,
      hostChecks,
      secretChecks
    })
  });
};

export const bootstrapCrawlerRoutePreflight = (
  options: BootstrapCrawlerRoutePreflightOptions
) => {
  const context = loadPreflightContext(options);
  const bootstrapActions = createMissingBootstrapArtifacts(context);
  const report = createCrawlerRoutePreflightReport(options);

  return CrawlerRoutePreflightReportSchema.parse({
    ...report,
    bootstrapActions
  });
};
