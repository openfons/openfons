import fs from 'node:fs';
import path from 'node:path';
import type { SecretRef } from '@openfons/contracts';

export type SecretResolution =
  | {
      configured: false;
      value: undefined;
      filePath: undefined;
    }
  | {
      configured: true;
      value: unknown;
      filePath: string;
    };

const getSecretBasePath = (secretRoot: string, ref: SecretRef) =>
  ref.scope === 'project'
    ? path.join(secretRoot, 'project', ref.projectId as string, ref.name)
    : path.join(secretRoot, 'global', ref.name);

const getCandidateSecretPaths = (secretRoot: string, ref: SecretRef) => {
  const basePath = getSecretBasePath(secretRoot, ref);
  return [basePath, `${basePath}.txt`, `${basePath}.json`];
};

const readSecretFile = (filePath: string): unknown => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return filePath.endsWith('.json') ? JSON.parse(raw) : raw.trim();
};

export const secretRefToSummary = (ref: SecretRef) =>
  ref.scope === 'project'
    ? `secret://project/${ref.projectId}/${ref.name}`
    : `secret://global/${ref.name}`;

export const resolveSecretValue = ({
  secretRoot,
  ref
}: {
  secretRoot: string;
  ref: SecretRef;
}): SecretResolution => {
  const filePath = getCandidateSecretPaths(secretRoot, ref).find((candidate) =>
    fs.existsSync(candidate)
  );

  if (!filePath) {
    return {
      configured: false,
      value: undefined,
      filePath: undefined
    };
  }

  return {
    configured: true,
    value: readSecretFile(filePath),
    filePath
  };
};
