import { describe, expect, it, vi } from 'vitest';
import { createYtDlpRunner } from '../../services/control-api/src/collection/crawler-execution/yt-dlp-runner.js';

const createExecutionPlan = ({
  url = 'https://www.youtube.com/watch?v=abc123',
  proxy
}: {
  url?: string;
  proxy?: unknown;
} = {}) => ({
  capturePlan: {
    topicRunId: 'topic_001',
    title: 'YouTube capture',
    url,
    snippet: 'matched snippet',
    sourceKind: 'official' as const,
    useAs: 'primary' as const,
    reportability: 'reportable' as const,
    riskLevel: 'low' as const,
    captureType: 'doc-page' as const,
    language: 'en',
    region: 'global'
  },
  runtime: {
    routeKey: 'youtube',
    mode: 'public-first' as const,
    collection: {
      pluginId: 'youtube-yt-dlp',
      type: 'crawler-adapter' as const,
      driver: 'yt-dlp' as const,
      config: {},
      secrets: {}
    },
    browser: undefined,
    accounts: [],
    cookies: [],
    proxy
  }
});

describe('yt-dlp crawler execution runner', () => {
  it('normalizes yt-dlp json stdout into capture summary and uses expected command args', async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const execFileImpl = vi.fn(
      (
        command: string,
        args: string[],
        _options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        calls.push({ command, args });

        if (command === 'broken-yt-dlp') {
          callback(new Error('spawn ENOENT'), '', 'spawn ENOENT');
          return;
        }

        callback(
          null,
          JSON.stringify({
            title: 'Sample Video Title',
            description: 'A detailed explanation for the sample video.',
            uploader: 'OpenFons Channel'
          }),
          ''
        );
      }
    );
    const runner = createYtDlpRunner({
      commandCandidates: ['broken-yt-dlp', 'yt-dlp', 'yt-dlp.exe'],
      execFileImpl
    });
    const plan = createExecutionPlan();

    const result = await runner(plan);

    expect(calls.map((item) => item.command)).toEqual(['broken-yt-dlp', 'yt-dlp']);
    expect(calls[1]?.args).toEqual([
      '--dump-single-json',
      '--no-warnings',
      '--skip-download',
      plan.capturePlan.url
    ]);
    expect(result.sourceCapture.summary).toContain('Sample Video Title');
    expect(result.collectionLogs).toHaveLength(1);
    expect(result.collectionLogs[0]).toMatchObject({
      topicRunId: plan.capturePlan.topicRunId,
      captureId: result.sourceCapture.id,
      step: 'capture',
      status: 'success'
    });
  });

  it('throws explicit error when all yt-dlp command candidates fail', async () => {
    const execFileImpl = vi.fn(
      (
        _command: string,
        _args: string[],
        _options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        callback(new Error('spawn ENOENT'), '', 'spawn ENOENT');
      }
    );
    const runner = createYtDlpRunner({
      commandCandidates: ['missing-a', 'missing-b', 'missing-c'],
      execFileImpl
    });

    await expect(runner(createExecutionPlan())).rejects.toThrow(
      /yt-dlp execution failed/
    );
    expect(execFileImpl).toHaveBeenCalledTimes(3);
  });

  it('rejects when command exits with error even if stdout is non-empty', async () => {
    const execFileImpl = vi.fn(
      (
        _command: string,
        _args: string[],
        _options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        callback(
          new Error('process exited with code 1'),
          JSON.stringify({ title: 'partial output' }),
          'yt-dlp failed'
        );
      }
    );
    const runner = createYtDlpRunner({
      commandCandidates: ['yt-dlp'],
      execFileImpl
    });

    await expect(runner(createExecutionPlan())).rejects.toThrow(
      /yt-dlp execution failed/
    );
  });

  it('rejects json payloads with invalid shape such as arrays', async () => {
    const execFileImpl = vi.fn(
      (
        _command: string,
        _args: string[],
        _options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        callback(null, '[]', '');
      }
    );
    const runner = createYtDlpRunner({
      commandCandidates: ['yt-dlp'],
      execFileImpl
    });

    await expect(runner(createExecutionPlan())).rejects.toThrow(
      /invalid yt-dlp json payload/i
    );
  });

  it('passes --proxy argument from runtime proxy pool endpoint', async () => {
    const calls: Array<{ command: string; args: string[] }> = [];
    const execFileImpl = vi.fn(
      (
        command: string,
        args: string[],
        _options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        calls.push({ command, args });
        callback(null, JSON.stringify({ title: 'Video with proxy' }), '');
      }
    );
    const runner = createYtDlpRunner({
      commandCandidates: ['yt-dlp'],
      execFileImpl
    });

    await runner(
      createExecutionPlan({
        proxy: {
          pluginId: 'global-proxy',
          type: 'proxy-source',
          driver: 'proxy-pool',
          config: {},
          secrets: {
            poolRef: {
              value: [{ endpoint: 'http://proxy.local:9000' }]
            }
          }
        }
      })
    );

    expect(calls[0]?.command).toBe('yt-dlp');
    expect(calls[0]?.args).toEqual(
      expect.arrayContaining(['--proxy', 'http://proxy.local:9000'])
    );
  });

  it('fails explicitly when proxy runtime exists but no endpoint is available', async () => {
    const execFileImpl = vi.fn(
      (
        _command: string,
        _args: string[],
        _options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void
      ) => {
        callback(new Error('unexpected command execution'), '', 'unexpected');
      }
    );
    const runner = createYtDlpRunner({
      commandCandidates: ['yt-dlp'],
      execFileImpl
    });

    await expect(
      runner(
        createExecutionPlan({
          proxy: {
            pluginId: 'global-proxy',
            type: 'proxy-source',
            driver: 'proxy-pool',
            config: {},
            secrets: {
              poolRef: {
                value: [{ endpoint: '' }]
              }
            }
          }
        })
      )
    ).rejects.toThrow(/proxy endpoint/i);
    expect(execFileImpl).not.toHaveBeenCalled();
  });
});
