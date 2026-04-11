import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app.js';

describe('control-api config center routes', () => {
  it('returns masked plugin metadata, validation, and resolution views', async () => {
    const incompleteSecretRoot = mkdtempSync(
      path.join(os.tmpdir(), 'openfons-control-api-a-')
    );
    const incompleteDir = path.join(incompleteSecretRoot, 'project', 'openfons');
    mkdirSync(incompleteDir, { recursive: true });
    writeFileSync(path.join(incompleteDir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(incompleteDir, 'google-cx'), 'google-cx');

    const fullSecretRoot = mkdtempSync(
      path.join(os.tmpdir(), 'openfons-control-api-b-')
    );
    const fullDir = path.join(fullSecretRoot, 'project', 'openfons');
    mkdirSync(fullDir, { recursive: true });
    writeFileSync(path.join(fullDir, 'google-api-key'), 'google-key');
    writeFileSync(path.join(fullDir, 'google-cx'), 'google-cx');
    writeFileSync(path.join(fullDir, 'pinchtab-token'), 'pinchtab-token');
    writeFileSync(path.join(fullDir, 'tiktok-cookie-main'), 'sessionid=abc');
    writeFileSync(
      path.join(fullDir, 'tiktok-account-main.json'),
      JSON.stringify({ username: 'collector-bot', password: 'not-for-repo' })
    );
    writeFileSync(
      path.join(fullDir, 'global-proxy-pool.json'),
      JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
    );

    const incompleteApp = createApp({
      configCenter: {
        repoRoot: process.cwd(),
        secretRoot: incompleteSecretRoot
      }
    });
    const fullApp = createApp({
      configCenter: {
        repoRoot: process.cwd(),
        secretRoot: fullSecretRoot
      }
    });

    const typesResponse = await incompleteApp.request('/api/v1/config/plugin-types');
    expect(typesResponse.status).toBe(200);

    const pluginTypeDetail = await incompleteApp.request(
      '/api/v1/config/plugin-types/search-provider'
    );
    expect(pluginTypeDetail.status).toBe(200);

    const pluginsResponse = await incompleteApp.request('/api/v1/config/plugins');
    expect(pluginsResponse.status).toBe(200);
    const pluginsBody = await pluginsResponse.json();
    expect(JSON.stringify(pluginsBody)).not.toContain('google-key');
    expect(
      pluginsBody.plugins.find(
        (item: { plugin: { pluginId: string } }) =>
          item.plugin.pluginId === 'pinchtab-local'
      ).plugin.secrets.tokenRef.configured
    ).toBe(false);
    expect(
      pluginsBody.plugins.find(
        (item: { plugin: { pluginId: string } }) =>
          item.plugin.pluginId === 'pinchtab-local'
      ).revision.etag.startsWith('sha256:')
    ).toBe(true);

    const pluginDetail = await incompleteApp.request(
      '/api/v1/config/plugins/google-default'
    );
    expect(pluginDetail.status).toBe(200);
    expect((await pluginDetail.json()).revision.etag.startsWith('sha256:')).toBe(
      true
    );

    const bindingResponse = await incompleteApp.request(
      '/api/v1/config/projects/openfons/bindings'
    );
    expect(bindingResponse.status).toBe(200);
    expect((await bindingResponse.json()).revision.etag.startsWith('sha256:')).toBe(
      true
    );

    const validateAllResponse = await incompleteApp.request('/api/v1/config/validate', {
      method: 'POST'
    });
    expect(validateAllResponse.status).toBe(200);

    const validateResponse = await incompleteApp.request(
      '/api/v1/config/projects/openfons/validate',
      {
        method: 'POST'
      }
    );
    expect(validateResponse.status).toBe(200);

    const preflightResponse = await incompleteApp.request(
      '/api/v1/config/projects/openfons/routes/youtube/preflight',
      { method: 'POST' }
    );
    expect(preflightResponse.status).toBe(200);
    const preflight = await preflightResponse.json();
    expect(preflight).toMatchObject({
      projectId: 'openfons',
      routeKey: 'youtube',
      status: 'blocked'
    });
    expect(JSON.stringify(preflight)).toContain('global-proxy-pool');
    expect(JSON.stringify(preflight)).not.toContain('not-for-repo');

    const resolveProjectResponse = await fullApp.request(
      '/api/v1/config/projects/openfons/resolve',
      { method: 'POST' }
    );
    expect(resolveProjectResponse.status).toBe(200);
    expect(await resolveProjectResponse.text()).not.toContain('google-key');

    const resolvePluginResponse = await fullApp.request(
      '/api/v1/config/plugins/google-default/resolve?projectId=openfons',
      { method: 'POST' }
    );
    expect(resolvePluginResponse.status).toBe(200);
    expect(await resolvePluginResponse.text()).not.toContain('google-key');
  });
});
