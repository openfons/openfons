import { describe, expect, it } from 'vitest';
import {
  ConfigBackupHistoryEntrySchema,
  ConfigCenterApiErrorSchema,
  ConfigDoctorReportSchema
} from '@openfons/contracts';

describe('@openfons/contracts config-center ops schemas', () => {
  it('parses operator errors, doctor reports, and backup history entries', () => {
    const error = ConfigCenterApiErrorSchema.parse({
      error: 'revision-conflict',
      message: 'revision conflict for plugin google-default',
      resource: 'plugin-instance',
      resourceId: 'google-default',
      projectId: 'openfons',
      retryable: true
    });

    const doctor = ConfigDoctorReportSchema.parse({
      projectId: 'openfons',
      status: 'blocked',
      bindingRevision: {
        etag: 'sha256:abc',
        updatedAt: '2026-04-11T19:00:00.000Z'
      },
      validation: {
        status: 'invalid',
        errors: [],
        warnings: [],
        skipped: [],
        checkedPluginIds: []
      },
      routes: [
        {
          routeKey: 'youtube',
          status: 'ready',
          mode: 'public-first',
          reason: 'all required runtime inputs are configured'
        }
      ],
      writePath: {
        configWritable: true,
        lockDirReady: true,
        backupDirReady: true
      }
    });

    const history = ConfigBackupHistoryEntrySchema.parse({
      resource: 'project-binding',
      resourceId: 'openfons',
      projectId: 'openfons',
      changed: true,
      createdAt: '2026-04-11T19:00:00.000Z',
      backupFile: 'artifacts/config-center-backups/2026-04-11-project-openfons.json',
      revision: {
        etag: 'sha256:def',
        updatedAt: '2026-04-11T19:00:00.000Z'
      }
    });

    expect(error.retryable).toBe(true);
    expect(doctor.routes[0]?.routeKey).toBe('youtube');
    expect(history.resource).toBe('project-binding');
  });
});
