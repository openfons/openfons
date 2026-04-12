import { readFileSync } from 'node:fs';
import path from 'node:path';
import type {
  ConfigWriteResult,
  PluginInstance
} from '@openfons/contracts';
import {
  listPluginInstanceRecords,
  loadConfigCenterState,
  loadProjectBinding
} from '../loader.js';
import { collectProjectClosure, validatePluginSelection } from '../validator.js';
import { writeJsonAtomically } from '../persistence/atomic-json.js';
import { writeConfigBackup } from '../persistence/backup.js';
import { appendConfigBackupHistoryEntry } from '../persistence/backup-history.js';
import { withRepoConfigLock } from '../persistence/lockfile.js';
import { buildRepoConfigRevision } from '../persistence/revision.js';

const toComparablePluginShape = (plugin: PluginInstance) =>
  JSON.stringify({
    id: plugin.id,
    type: plugin.type,
    driver: plugin.driver,
    enabled: plugin.enabled,
    scope: plugin.scope,
    config: plugin.config,
    secrets: plugin.secrets,
    dependencies: plugin.dependencies,
    policy: plugin.policy,
    healthCheck: plugin.healthCheck
  });

export const applyPluginInstanceWrite = async ({
  repoRoot,
  secretRoot,
  projectId,
  plugin,
  expectedRevision,
  dryRun
}: {
  repoRoot: string;
  secretRoot?: string;
  projectId: string;
  plugin: PluginInstance;
  expectedRevision?: string;
  dryRun: boolean;
}): Promise<ConfigWriteResult> =>
  withRepoConfigLock({
    repoRoot,
    resourceKey: `plugin-${plugin.id}`,
    fn: async (lockWaitMs) => {
      const current = listPluginInstanceRecords({ repoRoot }).find(
        (item) => item.plugin.id === plugin.id
      );

      if (expectedRevision && current && current.revision.etag !== expectedRevision) {
        throw new Error(`revision conflict for plugin ${plugin.id}`);
      }

      const nextUpdatedAt = new Date().toISOString();
      const changed = current
        ? toComparablePluginShape(current.plugin) !== toComparablePluginShape(plugin)
        : true;
      const nextPlugin: PluginInstance =
        changed || !current
          ? {
              ...plugin,
              meta: {
                ...plugin.meta,
                updatedAt: nextUpdatedAt,
                updatedBy: 'control-api'
              }
            }
          : current.plugin;

      const nextState = loadConfigCenterState({ repoRoot, secretRoot });
      const nextPlugins = nextState.pluginInstances
        .filter((item) => item.id !== plugin.id)
        .concat(nextPlugin);
      const binding = loadProjectBinding({ repoRoot, projectId });
      const validation = validatePluginSelection({
        state: { ...nextState, pluginInstances: nextPlugins },
        pluginIds: [...new Set([...collectProjectClosure(binding), plugin.id])]
      });

      if (validation.status === 'invalid') {
        throw new Error(`invalid plugin write for ${plugin.id}`);
      }

      const revision =
        !changed && current
          ? current.revision
          : buildRepoConfigRevision({
              rawContent: `${JSON.stringify(nextPlugin, null, 2)}\n`,
              updatedAt: nextPlugin.meta?.updatedAt ?? nextUpdatedAt
            });

      if (dryRun) {
        return {
          status: 'dry-run',
          resource: 'plugin-instance',
          resourceId: plugin.id,
          changed,
          revision,
          previousRevision: current?.revision,
          validation,
          lockWaitMs
        };
      }

      if (!changed && current) {
        return {
          status: 'applied',
          resource: 'plugin-instance',
          resourceId: plugin.id,
          changed: false,
          revision: current.revision,
          previousRevision: current.revision,
          validation,
          lockWaitMs
        };
      }

      const targetPath =
        current?.filePath ??
        path.join(repoRoot, 'config', 'plugins', 'instances', `${plugin.id}.json`);
      const backupFile = current
        ? writeConfigBackup({
            repoRoot,
            resourceKey: `plugin-${plugin.id}`,
            rawContent: current.rawContent
          })
        : undefined;

      writeJsonAtomically({ targetPath, value: nextPlugin });
      const persistedContent = readFileSync(targetPath, 'utf8');
      const persistedRevision = buildRepoConfigRevision({
        rawContent: persistedContent,
        updatedAt: nextPlugin.meta?.updatedAt ?? nextUpdatedAt
      });

      if (changed && backupFile) {
        appendConfigBackupHistoryEntry({
          repoRoot,
          entry: {
            resource: 'plugin-instance',
            resourceId: plugin.id,
            projectId,
            changed: true,
            createdAt: new Date().toISOString(),
            backupFile,
            revision: persistedRevision,
            previousRevision: current?.revision
          }
        });
      }

      return {
        status: 'applied',
        resource: 'plugin-instance',
        resourceId: plugin.id,
        changed,
        revision: persistedRevision,
        previousRevision: current?.revision,
        validation,
        backupFile,
        lockWaitMs
      };
    }
  });
