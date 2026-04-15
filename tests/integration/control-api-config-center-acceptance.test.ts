import { copyFileSync, cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../services/control-api/src/app.js';

const cloneRepoFixture = () => {
  const repoRoot = mkdtempSync(
    path.join(os.tmpdir(), 'openfons-config-acceptance-')
  );
  const secretRoot = mkdtempSync(
    path.join(os.tmpdir(), 'openfons-config-acceptance-secrets-')
  );
  cpSync(path.join(process.cwd(), 'config'), path.join(repoRoot, 'config'), {
    recursive: true
  });
  mkdirSync(path.join(repoRoot, 'artifacts'), { recursive: true });
  const projectSecretDir = path.join(secretRoot, 'project', 'openfons');
  mkdirSync(projectSecretDir, { recursive: true });
  writeFileSync(path.join(projectSecretDir, 'google-api-key'), 'google-key');
  writeFileSync(path.join(projectSecretDir, 'google-cx'), 'google-cx');
  writeFileSync(path.join(projectSecretDir, 'pinchtab-token'), 'pinchtab-token');
  writeFileSync(
    path.join(projectSecretDir, 'tiktok-cookie-main'),
    '.tiktok.com\tTRUE\t/\tFALSE\t2147483647\tms_token\tabc'
  );
  writeFileSync(
    path.join(projectSecretDir, 'tiktok-account-main.json'),
    JSON.stringify({ username: 'collector-bot', password: 'secret' })
  );
  writeFileSync(
    path.join(projectSecretDir, 'global-proxy-pool.json'),
    JSON.stringify([{ endpoint: 'http://proxy.local:9000' }])
  );
  return { repoRoot, secretRoot };
};

describe('control-api config-center operations acceptance', () => {
  it('covers revision read, dry-run, no-op apply, apply, doctor, backups, and rollback', async () => {
    const { repoRoot, secretRoot } = cloneRepoFixture();
    const app = createApp({ configCenter: { repoRoot, secretRoot } });

    const bindingDetailResponse = await app.request(
      '/api/v1/config/projects/openfons/bindings'
    );
    expect(bindingDetailResponse.status).toBe(200);
    const bindingDetail = await bindingDetailResponse.json();

    const initialValidateResponse = await app.request(
      '/api/v1/config/projects/openfons/validate',
      { method: 'POST' }
    );
    expect(initialValidateResponse.status).toBe(200);
    const initialValidate = await initialValidateResponse.json();

    const initialDoctorResponse = await app.request(
      '/api/v1/config/projects/openfons/doctor'
    );
    expect(initialDoctorResponse.status).toBe(200);
    const initialDoctor = await initialDoctorResponse.json();

    const historyBeforeResponse = await app.request(
      '/api/v1/config/backups?projectId=openfons'
    );
    expect(historyBeforeResponse.status).toBe(200);
    expect((await historyBeforeResponse.json()).entries).toHaveLength(0);

    const nextBinding = {
      ...bindingDetail.binding,
      overrides: {
        ...(bindingDetail.binding.overrides ?? {}),
        doctorMarker: 'v016-acceptance'
      }
    };

    const dryRunResponse = await app.request(
      '/api/v1/config/projects/openfons/bindings?dryRun=true',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: bindingDetail.revision.etag,
          binding: nextBinding
        })
      }
    );

    expect(dryRunResponse.status).toBe(200);
    expect(await dryRunResponse.json()).toMatchObject({
      status: 'dry-run',
      resource: 'project-binding',
      resourceId: 'openfons',
      changed: true
    });

    const historyAfterDryRunResponse = await app.request(
      '/api/v1/config/backups?projectId=openfons'
    );
    expect(historyAfterDryRunResponse.status).toBe(200);
    expect((await historyAfterDryRunResponse.json()).entries).toHaveLength(0);

    const noOpApplyResponse = await app.request(
      '/api/v1/config/projects/openfons/bindings',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: bindingDetail.revision.etag,
          binding: bindingDetail.binding
        })
      }
    );

    expect(noOpApplyResponse.status).toBe(200);
    expect(await noOpApplyResponse.json()).toMatchObject({
      status: 'applied',
      resource: 'project-binding',
      resourceId: 'openfons',
      changed: false
    });

    const historyAfterNoOpResponse = await app.request(
      '/api/v1/config/backups?projectId=openfons'
    );
    expect(historyAfterNoOpResponse.status).toBe(200);
    expect((await historyAfterNoOpResponse.json()).entries).toHaveLength(0);

    const applyResponse = await app.request(
      '/api/v1/config/projects/openfons/bindings',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: bindingDetail.revision.etag,
          binding: nextBinding
        })
      }
    );

    expect(applyResponse.status).toBe(200);
    const applied = await applyResponse.json();
    expect(applied).toMatchObject({
      status: 'applied',
      resource: 'project-binding',
      resourceId: 'openfons',
      changed: true
    });
    expect(typeof applied.backupFile).toBe('string');

    const doctorAfterApplyResponse = await app.request(
      '/api/v1/config/projects/openfons/doctor'
    );
    expect(doctorAfterApplyResponse.status).toBe(200);
    const doctorAfterApply = await doctorAfterApplyResponse.json();
    expect(doctorAfterApply.bindingRevision.etag).not.toBe(
      bindingDetail.revision.etag
    );
    expect(doctorAfterApply.writePath).toMatchObject({
      configWritable: true,
      lockDirReady: true,
      backupDirReady: true
    });

    const historyAfterApplyResponse = await app.request(
      '/api/v1/config/backups?projectId=openfons'
    );
    expect(historyAfterApplyResponse.status).toBe(200);
    const historyAfterApply = await historyAfterApplyResponse.json();
    expect(historyAfterApply.entries).toHaveLength(1);
    expect(historyAfterApply.entries[0]).toMatchObject({
      resource: 'project-binding',
      resourceId: 'openfons',
      projectId: 'openfons',
      backupFile: applied.backupFile,
      previousRevision: bindingDetail.revision
    });

    copyFileSync(
      applied.backupFile,
      path.join(repoRoot, 'config', 'projects', 'openfons', 'plugins', 'bindings.json')
    );

    const bindingAfterRollbackResponse = await app.request(
      '/api/v1/config/projects/openfons/bindings'
    );
    expect(bindingAfterRollbackResponse.status).toBe(200);
    const bindingAfterRollback = await bindingAfterRollbackResponse.json();
    expect(bindingAfterRollback.binding).toEqual(bindingDetail.binding);
    expect(bindingAfterRollback.revision.etag).toBe(bindingDetail.revision.etag);

    const validateAfterRollbackResponse = await app.request(
      '/api/v1/config/projects/openfons/validate',
      { method: 'POST' }
    );
    expect(validateAfterRollbackResponse.status).toBe(200);
    expect(await validateAfterRollbackResponse.json()).toEqual(initialValidate);

    const doctorAfterRollbackResponse = await app.request(
      '/api/v1/config/projects/openfons/doctor'
    );
    expect(doctorAfterRollbackResponse.status).toBe(200);
    expect(await doctorAfterRollbackResponse.json()).toMatchObject({
      projectId: initialDoctor.projectId,
      status: initialDoctor.status,
      validation: initialDoctor.validation,
      routes: initialDoctor.routes,
      writePath: initialDoctor.writePath,
      bindingRevision: {
        etag: initialDoctor.bindingRevision.etag
      }
    });
  });
});
