import fs from 'node:fs';
import path from 'node:path';
import {
  PluginInstanceSchema,
  ProjectBindingSchema,
  type PluginInstance,
  type ProjectBinding,
  type RepoConfigRevision
} from '@openfons/contracts';
import { createConfigCenterPaths } from './config-paths.js';
import { buildRepoConfigRevision } from './persistence/revision.js';

export type ConfigCenterState = {
  repoRoot: string;
  secretRoot: string;
  pluginInstances: PluginInstance[];
};

export type PluginInstanceRecord = {
  filePath: string;
  plugin: PluginInstance;
  revision: RepoConfigRevision;
  rawContent: string;
};

export type ProjectBindingRecord = {
  filePath: string;
  binding: ProjectBinding;
  revision: RepoConfigRevision;
  rawContent: string;
};

export const listPluginInstanceRecords = ({
  repoRoot
}: {
  repoRoot: string;
}): PluginInstanceRecord[] => {
  const { instancesDir } = createConfigCenterPaths({ repoRoot });

  return fs
    .readdirSync(instancesDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const filePath = path.join(instancesDir, name);
      const rawContent = fs.readFileSync(filePath, 'utf8');
      const plugin = PluginInstanceSchema.parse(JSON.parse(rawContent));

      return {
        filePath,
        rawContent,
        plugin,
        revision: buildRepoConfigRevision({
          rawContent,
          updatedAt: plugin.meta?.updatedAt ?? fs.statSync(filePath).mtime.toISOString()
        })
      };
    })
    .sort((left, right) => left.plugin.id.localeCompare(right.plugin.id));
};

export const loadPluginInstances = ({
  repoRoot
}: {
  repoRoot: string;
}): PluginInstance[] => {
  return listPluginInstanceRecords({ repoRoot }).map((item) => item.plugin);
};

export const loadProjectBindingRecord = ({
  repoRoot,
  projectId
}: {
  repoRoot: string;
  projectId: string;
}): ProjectBindingRecord => {
  const { projectDir } = createConfigCenterPaths({ repoRoot });
  const filePath = path.join(projectDir, projectId, 'plugins', 'bindings.json');
  const rawContent = fs.readFileSync(filePath, 'utf8');
  const binding = ProjectBindingSchema.parse(JSON.parse(rawContent));

  return {
    filePath,
    rawContent,
    binding,
    revision: buildRepoConfigRevision({
      rawContent,
      updatedAt: binding.meta?.updatedAt ?? fs.statSync(filePath).mtime.toISOString()
    })
  };
};

export const loadProjectBinding = ({
  repoRoot,
  projectId
}: {
  repoRoot: string;
  projectId: string;
}): ProjectBinding => {
  return loadProjectBindingRecord({ repoRoot, projectId }).binding;
};

export const loadConfigCenterState = ({
  repoRoot,
  secretRoot
}: {
  repoRoot: string;
  secretRoot?: string;
}): ConfigCenterState => {
  const paths = createConfigCenterPaths({ repoRoot, secretRoot });

  return {
    repoRoot,
    secretRoot: paths.secretRoot,
    pluginInstances: loadPluginInstances({ repoRoot })
  };
};
