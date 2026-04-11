import { readFileSync } from 'node:fs';
import type {
  ConfigWriteResult,
  ProjectBinding
} from '@openfons/contracts';
import { loadConfigCenterState, loadProjectBindingRecord } from '../loader.js';
import { collectProjectClosure, validatePluginSelection } from '../validator.js';
import { writeJsonAtomically } from '../persistence/atomic-json.js';
import { writeConfigBackup } from '../persistence/backup.js';
import { withRepoConfigLock } from '../persistence/lockfile.js';
import { buildRepoConfigRevision } from '../persistence/revision.js';

const toComparableBindingShape = (binding: ProjectBinding) =>
  JSON.stringify({
    projectId: binding.projectId,
    enabledPlugins: binding.enabledPlugins,
    roles: binding.roles,
    routes: binding.routes,
    overrides: binding.overrides
  });

export const applyProjectBindingWrite = async ({
  repoRoot,
  secretRoot,
  projectId,
  binding,
  expectedRevision,
  dryRun
}: {
  repoRoot: string;
  secretRoot?: string;
  projectId: string;
  binding: ProjectBinding;
  expectedRevision?: string;
  dryRun: boolean;
}): Promise<ConfigWriteResult> =>
  withRepoConfigLock({
    repoRoot,
    resourceKey: `project-${projectId}-bindings`,
    fn: async (lockWaitMs) => {
      const current = loadProjectBindingRecord({ repoRoot, projectId });

      if (expectedRevision && current.revision.etag !== expectedRevision) {
        throw new Error(`revision conflict for project ${projectId}`);
      }

      const nextUpdatedAt = new Date().toISOString();
      const changed =
        toComparableBindingShape(current.binding) !==
        toComparableBindingShape({ ...binding, projectId });
      const nextBinding: ProjectBinding = changed
        ? {
            ...binding,
            projectId,
            meta: {
              ...binding.meta,
              updatedAt: nextUpdatedAt,
              updatedBy: 'control-api'
            }
          }
        : current.binding;
      const state = loadConfigCenterState({ repoRoot, secretRoot });
      const validation = validatePluginSelection({
        state,
        pluginIds: collectProjectClosure(nextBinding)
      });

      if (validation.status === 'invalid') {
        throw new Error(`invalid project binding write for ${projectId}`);
      }

      const revision = !changed
        ? current.revision
        : buildRepoConfigRevision({
            rawContent: `${JSON.stringify(nextBinding, null, 2)}\n`,
            updatedAt: nextBinding.meta?.updatedAt ?? nextUpdatedAt
          });

      if (dryRun) {
        return {
          status: 'dry-run',
          resource: 'project-binding',
          resourceId: projectId,
          changed,
          revision,
          previousRevision: current.revision,
          validation,
          lockWaitMs
        };
      }

      if (!changed) {
        return {
          status: 'applied',
          resource: 'project-binding',
          resourceId: projectId,
          changed: false,
          revision: current.revision,
          previousRevision: current.revision,
          validation,
          lockWaitMs
        };
      }

      const backupFile = writeConfigBackup({
        repoRoot,
        resourceKey: `project-${projectId}-bindings`,
        rawContent: current.rawContent
      });

      writeJsonAtomically({ targetPath: current.filePath, value: nextBinding });
      const persistedContent = readFileSync(current.filePath, 'utf8');

      return {
        status: 'applied',
        resource: 'project-binding',
        resourceId: projectId,
        changed,
        revision: buildRepoConfigRevision({
          rawContent: persistedContent,
          updatedAt: nextBinding.meta?.updatedAt ?? nextUpdatedAt
        }),
        previousRevision: current.revision,
        validation,
        backupFile,
        lockWaitMs
      };
    }
  });
