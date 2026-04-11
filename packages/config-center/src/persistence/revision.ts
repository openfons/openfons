import { createHash } from 'node:crypto';
import type { RepoConfigRevision } from '@openfons/contracts';

export const buildRepoConfigRevision = ({
  rawContent,
  updatedAt
}: {
  rawContent: string;
  updatedAt: string;
}): RepoConfigRevision => ({
  etag: `sha256:${createHash('sha256').update(rawContent).digest('hex')}`,
  updatedAt
});
