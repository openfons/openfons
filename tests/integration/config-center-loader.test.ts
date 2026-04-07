import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildMaskedPluginInstanceView,
  loadConfigCenterState
} from '@openfons/config-center';

describe('config-center loader', () => {
  it('loads repo-visible instances and derives masked configured status from the secret store', () => {
    const secretRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-loader-'));
    const dir = path.join(secretRoot, 'project', 'openfons');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(dir, 'google-cx'), 'google-cx');

    const state = loadConfigCenterState({ repoRoot: process.cwd(), secretRoot });
    const google = state.pluginInstances.find((item) => item.id === 'google-default');
    const pinchtab = state.pluginInstances.find((item) => item.id === 'pinchtab-local');

    expect(google).toBeDefined();
    expect(pinchtab).toBeDefined();

    expect(
      buildMaskedPluginInstanceView({ plugin: google!, secretRoot }).secrets.apiKeyRef.configured
    ).toBe(true);
    expect(
      buildMaskedPluginInstanceView({ plugin: pinchtab!, secretRoot }).secrets.tokenRef.configured
    ).toBe(false);
  });
});
