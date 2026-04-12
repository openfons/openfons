import fs from 'node:fs';
import path from 'node:path';
import type {
  ConfigDoctorReport,
  ConfigDoctorRoute
} from '@openfons/contracts';
import { loadConfigCenterState, loadProjectBindingRecord } from './loader.js';
import { validateProjectConfig } from './validator.js';

const findWritableBaseDir = (targetPath: string) => {
  let current = targetPath;

  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return current;
};

const canUseDir = (targetPath: string) => {
  try {
    if (fs.existsSync(targetPath)) {
      const targetStat = fs.statSync(targetPath);
      if (!targetStat.isDirectory()) {
        return false;
      }

      fs.accessSync(targetPath, fs.constants.W_OK);
      return true;
    }

    const baseDir = findWritableBaseDir(targetPath);
    const baseStat = fs.statSync(baseDir);

    if (!baseStat.isDirectory()) {
      return false;
    }

    fs.accessSync(baseDir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

const buildWritePathReadiness = (repoRoot: string) => {
  const configDir = path.join(repoRoot, 'config');
  const lockDir = path.join(repoRoot, '.locks');
  const backupDir = path.join(repoRoot, 'artifacts', 'config-center-backups');

  return {
    configWritable: canUseDir(configDir),
    lockDirReady: canUseDir(lockDir),
    backupDirReady: canUseDir(backupDir)
  };
};

export const createProjectConfigDoctorReport = ({
  repoRoot,
  secretRoot,
  projectId,
  routes
}: {
  repoRoot: string;
  secretRoot?: string;
  projectId: string;
  routes: ConfigDoctorRoute[];
}): ConfigDoctorReport => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const binding = loadProjectBindingRecord({ repoRoot, projectId });
  const validation = validateProjectConfig({ state, projectId });
  const status =
    validation.status === 'invalid' || routes.some((route) => route.status === 'blocked')
      ? 'blocked'
      : validation.status === 'degraded' || routes.some((route) => route.status === 'degraded')
        ? 'degraded'
        : 'ready';

  return {
    projectId,
    status,
    bindingRevision: binding.revision,
    validation,
    routes,
    writePath: buildWritePathReadiness(repoRoot)
  };
};
