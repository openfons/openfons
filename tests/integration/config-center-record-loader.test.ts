import { describe, expect, it } from 'vitest';
import {
  listPluginInstanceRecords,
  loadProjectBindingRecord
} from '@openfons/config-center';

describe('config-center record loaders', () => {
  it('returns file paths and revisions for plugin and project records', () => {
    const plugins = listPluginInstanceRecords({ repoRoot: process.cwd() });
    const google = plugins.find((item) => item.plugin.id === 'google-default');
    const binding = loadProjectBindingRecord({
      repoRoot: process.cwd(),
      projectId: 'openfons'
    });

    expect(google?.filePath.endsWith('google-default.json')).toBe(true);
    expect(google?.revision.etag.startsWith('sha256:')).toBe(true);
    expect(binding.filePath.endsWith('bindings.json')).toBe(true);
    expect(binding.revision.etag.startsWith('sha256:')).toBe(true);
  });
});
