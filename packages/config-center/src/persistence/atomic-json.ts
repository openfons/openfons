import fs from 'node:fs';
import path from 'node:path';

export const writeJsonAtomically = ({
  targetPath,
  value
}: {
  targetPath: string;
  value: unknown;
}) => {
  const tempPath = `${targetPath}.tmp`;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, targetPath);
};
