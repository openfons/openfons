import fs from 'node:fs';
import path from 'node:path';

export const withRepoConfigLock = async <T>({
  repoRoot,
  resourceKey,
  fn
}: {
  repoRoot: string;
  resourceKey: string;
  fn: (lockWaitMs: number) => Promise<T>;
}): Promise<T> => {
  const startedAt = Date.now();
  const lockDir = path.join(repoRoot, '.locks');
  const lockPath = path.join(lockDir, `${resourceKey}.lock`);
  fs.mkdirSync(lockDir, { recursive: true });

  try {
    const fd = fs.openSync(lockPath, 'wx');
    fs.closeSync(fd);
  } catch {
    throw new Error(`lock unavailable for ${resourceKey}`);
  }

  try {
    return await fn(Date.now() - startedAt);
  } finally {
    fs.rmSync(lockPath, { force: true });
  }
};
