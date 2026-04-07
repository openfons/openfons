import os from 'node:os';
import path from 'node:path';

export type ConfigCenterPaths = {
  repoRoot: string;
  instancesDir: string;
  projectDir: string;
  secretRoot: string;
};

export const createConfigCenterPaths = ({
  repoRoot,
  secretRoot = process.env.OPENFONS_SECRET_ROOT ??
    path.join(os.homedir(), '.openfons', 'secrets')
}: {
  repoRoot: string;
  secretRoot?: string;
}): ConfigCenterPaths => ({
  repoRoot,
  instancesDir: path.join(repoRoot, 'config', 'plugins', 'instances'),
  projectDir: path.join(repoRoot, 'config', 'projects'),
  secretRoot
});
