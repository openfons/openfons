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
import { withRepoConfigLock } from '../persistence/lockfile.js';
import { buildRepoConfigRevision } from '../persistence/revision.js';

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
      const nextPlugin: PluginInstance = {
        ...plugin,
        meta: {
          ...plugin.meta,
          updatedAt: nextUpdatedAt,
          updatedBy: 'control-api'
        }
      };
      const changed =
        JSON.stringify(current?.plugin ?? null) !== JSON.stringify(nextPlugin);

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

      const revision = buildRepoConfigRevision({
        rawContent: `${JSON.stringify(nextPlugin, null, 2)}\n`,
        updatedAt: nextUpdatedAt
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

      return {
        status: 'applied',
        resource: 'plugin-instance',
        resourceId: plugin.id,
        changed,
        revision: buildRepoConfigRevision({
          rawContent: persistedContent,
          updatedAt: nextUpdatedAt
        }),
        previousRevision: current?.revision,
        validation,
        backupFile,
        lockWaitMs
      };
    }
  });
