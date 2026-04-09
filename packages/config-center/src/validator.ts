import type {
  ConfigIssue,
  ConfigValidationResult,
  PluginDependency,
  PluginInstance,
  ProjectBinding
} from '@openfons/contracts';
import type { ConfigCenterState } from './loader.js';
import { loadProjectBinding } from './loader.js';
import { resolveSecretValue } from './secret-store.js';
import { getPluginSpec } from './spec-registry.js';

const toArray = <T>(value: T | T[]) => (Array.isArray(value) ? value : [value]);

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const collectRoleIds = (roles: ProjectBinding['roles']) =>
  Object.values(roles).flatMap((value) => toArray(value));

const collectRouteIds = (binding: ProjectBinding) =>
  Object.values(binding.routes).flatMap((route) => [
    ...(route.discovery ?? []),
    ...(route.browser ? [route.browser] : []),
    ...(route.collection ? [route.collection] : []),
    ...(route.accounts ?? []),
    ...(route.cookies ?? []),
    ...(route.proxy ? [route.proxy] : [])
  ]);

const buildIssue = (
  severity: ConfigIssue['severity'],
  code: string,
  message: string,
  extra: Partial<Omit<ConfigIssue, 'severity' | 'code' | 'message'>> = {}
): ConfigIssue => ({
  severity,
  code,
  message,
  ...extra
});

const validateDependency = ({
  plugin,
  dependency,
  byId,
  checkedPluginIds,
  errors
}: {
  plugin: PluginInstance;
  dependency: PluginDependency;
  byId: Map<string, PluginInstance>;
  checkedPluginIds: string[];
  errors: ConfigIssue[];
}) => {
  const target = byId.get(dependency.pluginId);

  if (!target) {
    errors.push(
      buildIssue(
        'block',
        'missing_dependency',
        `${plugin.id} depends on unknown plugin ${dependency.pluginId}`,
        {
          pluginId: plugin.id
        }
      )
    );
    return;
  }

  if (target.type !== dependency.type) {
    errors.push(
      buildIssue(
        'block',
        'dependency_type_mismatch',
        `${plugin.id} expects ${dependency.pluginId} to be ${dependency.type}, got ${target.type}`,
        {
          pluginId: plugin.id
        }
      )
    );
  }

  if (!checkedPluginIds.includes(dependency.pluginId)) {
    errors.push(
      buildIssue(
        'block',
        'dependency_outside_project_closure',
        `${plugin.id} dependency ${dependency.pluginId} is outside the project closure`,
        {
          pluginId: plugin.id
        }
      )
    );
  }
};

export const collectProjectClosure = (binding: ProjectBinding) =>
  [...new Set([...binding.enabledPlugins, ...collectRoleIds(binding.roles), ...collectRouteIds(binding)])];

export const validatePluginSelection = ({
  state,
  pluginIds
}: {
  state: ConfigCenterState;
  pluginIds: string[];
}): ConfigValidationResult => {
  const checkedPluginIds = [...new Set(pluginIds)];
  const byId = new Map(state.pluginInstances.map((item) => [item.id, item]));
  const errors: ConfigIssue[] = [];
  const warnings: ConfigIssue[] = [];
  const skipped: ConfigIssue[] = [];

  for (const pluginId of checkedPluginIds) {
    const plugin = byId.get(pluginId);

    if (!plugin) {
      errors.push(
        buildIssue(
          'block',
          'unknown_plugin',
          `binding references unknown plugin ${pluginId}`,
          { pluginId }
        )
      );
      continue;
    }

    if (!plugin.enabled) {
      errors.push(
        buildIssue(
          'block',
          'disabled_plugin',
          `binding references disabled plugin ${plugin.id}`,
          { pluginId: plugin.id }
        )
      );
      continue;
    }

    const spec = getPluginSpec(plugin.type, plugin.driver);
    if (!spec) {
      errors.push(
        buildIssue(
          'block',
          'unknown_driver',
          `${plugin.id} uses unsupported driver ${plugin.driver}`,
          { pluginId: plugin.id }
        )
      );
      continue;
    }

    for (const field of spec.requiredConfigFields) {
      if (!hasOwn(plugin.config, field)) {
        errors.push(
          buildIssue(
            'block',
            'missing_config_field',
            `${plugin.id} requires config.${field}`,
            {
              pluginId: plugin.id,
              field
            }
          )
        );
      }
    }

    for (const field of spec.secretFields) {
      const ref = plugin.secrets[field];

      if (!ref) {
        errors.push(
          buildIssue('block', 'missing_secret_ref', `${plugin.id} requires ${field}`, {
            pluginId: plugin.id,
            field
          })
        );
        continue;
      }

      const resolved = resolveSecretValue({
        secretRoot: state.secretRoot,
        ref
      });

      if (!resolved.configured) {
        errors.push(
          buildIssue(
            'block',
            'missing_secret_value',
            `${plugin.id} secret ${field} was not found`,
            {
              pluginId: plugin.id,
              field
            }
          )
        );
      }
    }

    for (const dependency of plugin.dependencies) {
      if (!spec.allowedDependencyTypes.includes(dependency.type)) {
        errors.push(
          buildIssue(
            'block',
            'unsupported_dependency_type',
            `${plugin.id} does not allow ${dependency.type} dependencies`,
            {
              pluginId: plugin.id
            }
          )
        );
      }

      validateDependency({
        plugin,
        dependency,
        byId,
        checkedPluginIds,
        errors
      });
    }
  }

  for (const plugin of state.pluginInstances) {
    if (!checkedPluginIds.includes(plugin.id)) {
      skipped.push(
        buildIssue(
          'skip',
          'unused_plugin',
          `${plugin.id} is outside the current project closure`,
          {
            pluginId: plugin.id
          }
        )
      );
    }
  }

  return {
    status: errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'degraded' : 'valid',
    errors,
    warnings,
    skipped,
    checkedPluginIds
  };
};

export const validateProjectConfig = ({
  state,
  projectId
}: {
  state: ConfigCenterState;
  projectId: string;
}): ConfigValidationResult => {
  const binding = loadProjectBinding({ repoRoot: state.repoRoot, projectId });
  return validatePluginSelection({
    state,
    pluginIds: collectProjectClosure(binding)
  });
};
