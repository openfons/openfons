import fs from 'node:fs';
import path from 'node:path';
import {
  PluginInstanceSchema,
  ProjectBindingSchema,
  type PluginInstance,
  type ProjectBinding
} from '@openfons/contracts';
import { createConfigCenterPaths } from './config-paths.js';

const readJsonFile = <T>(filePath: string): T =>
  JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;

export type ConfigCenterState = {
  repoRoot: string;
  secretRoot: string;
  pluginInstances: PluginInstance[];
};

export const loadPluginInstances = ({
  repoRoot
}: {
  repoRoot: string;
}): PluginInstance[] => {
  const { instancesDir } = createConfigCenterPaths({ repoRoot });

  return fs
    .readdirSync(instancesDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) =>
      PluginInstanceSchema.parse(readJsonFile(path.join(instancesDir, name)))
    )
    .sort((left, right) => left.id.localeCompare(right.id));
};

export const loadProjectBinding = ({
  repoRoot,
  projectId
}: {
  repoRoot: string;
  projectId: string;
}): ProjectBinding => {
  const { projectDir } = createConfigCenterPaths({ repoRoot });
  const filePath = path.join(projectDir, projectId, 'plugins', 'bindings.json');

  return ProjectBindingSchema.parse(readJsonFile(filePath));
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
