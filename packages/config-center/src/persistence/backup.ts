import fs from 'node:fs';
import path from 'node:path';

export const writeConfigBackup = ({
  repoRoot,
  resourceKey,
  rawContent
}: {
  repoRoot: string;
  resourceKey: string;
  rawContent: string;
}) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(
    repoRoot,
    'artifacts',
    'config-center-backups',
    `${stamp}-${resourceKey}.json`
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rawContent, 'utf8');
  return filePath;
};
