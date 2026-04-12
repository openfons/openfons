import fs from 'node:fs';
import path from 'node:path';
import type { ConfigBackupHistoryEntry } from '@openfons/contracts';

const resolveManifestPath = (repoRoot: string) =>
  path.join(repoRoot, 'artifacts', 'config-center-backups', 'manifest.jsonl');

export const appendConfigBackupHistoryEntry = ({
  repoRoot,
  entry
}: {
  repoRoot: string;
  entry: ConfigBackupHistoryEntry;
}) => {
  const manifestPath = resolveManifestPath(repoRoot);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.appendFileSync(manifestPath, `${JSON.stringify(entry)}\n`, 'utf8');
};

export const listConfigBackupHistoryEntries = ({
  repoRoot,
  resource,
  resourceId,
  projectId
}: {
  repoRoot: string;
  resource?: string;
  resourceId?: string;
  projectId?: string;
}) => {
  const manifestPath = resolveManifestPath(repoRoot);

  if (!fs.existsSync(manifestPath)) {
    return [];
  }

  return fs
    .readFileSync(manifestPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ConfigBackupHistoryEntry)
    .filter((entry) => (resource ? entry.resource === resource : true))
    .filter((entry) => (resourceId ? entry.resourceId === resourceId : true))
    .filter((entry) => (projectId ? entry.projectId === projectId : true))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};
