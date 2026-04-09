import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { PassThrough } from 'node:stream';
import {
  createDefaultTikTokApiBridgeRunner,
  createTikTokApiRunner
} from '../../services/control-api/src/collection/crawler-execution/tiktok-api-runner.js';

const createExecutionPlan = ({
  url = 'https://www.tiktok.com/@openfons',
  accounts = [
    {
      pluginId: 'tiktok-account-main',
      type: 'account-source' as const,
      driver: 'credentials-json',
      config: {},
      secrets: {
        accountRef: {
          value: {
            username: 'collector-bot',
            password: 'secret'
          }
        }
      }
    }
  ],
  cookies = [
    {
      pluginId: 'tiktok-cookie-main',
      type: 'cookie-source' as const,
      driver: 'cookie-text',
      config: {},
      secrets: {
        sessionRef: {
          value: 'sessionid=abc123;'
        }
      }
    }
  ],
  proxy
}: {
  url?: string;
  accounts?: unknown[];
  cookies?: unknown[];
  proxy?: unknown;
} = {}) => ({
  capturePlan: {
    topicRunId: 'topic_001',
    title: 'TikTok capture',
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
    routeKey: 'tiktok',
    mode: 'requires-auth' as const,
    collection: {
      pluginId: 'tiktok-adapter',
      type: 'crawler-adapter' as const,
      driver: 'tiktok-api' as const,
      config: {},
      secrets: {}
    },
    browser: undefined,
    accounts,
    cookies,
    proxy
  }
});

describe('tiktok-api crawler execution runner', () => {
  it('materializes runtime credentials and parses bridge JSON output', async () => {
    const repoRoot = process.cwd();
    let materializedDir = '';
    const runBridge = vi.fn(async (request: { inputJson: string }) => {
      const payload = JSON.parse(request.inputJson) as {
        auth: {
          accountFilePath: string;
          cookieFilePath: string;
        };
        proxy?: {
          endpoint?: string;
        };
      };
      materializedDir = path.dirname(payload.auth.accountFilePath);

      expect(readFileSync(payload.auth.accountFilePath, 'utf8')).toContain(
        '"username": "collector-bot"'
      );
      expect(readFileSync(payload.auth.cookieFilePath, 'utf8')).toContain(
        'sessionid=abc123;'
      );
      expect(payload.proxy?.endpoint).toBe('http://proxy.local:9000');

      return JSON.stringify({
        status: 'success',
        summary: 'Captured via TikTokApi bridge'
      });
    });
    const runner = createTikTokApiRunner({
      repoRoot,
      runBridge
    });
    const plan = createExecutionPlan({
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
    });

    const result = await runner(plan);

    expect(runBridge).toHaveBeenCalledTimes(1);
    expect(materializedDir).not.toBe('');
    expect(existsSync(materializedDir)).toBe(false);
    const bridgeInput = runBridge.mock.calls[0]?.[0] as {
      envPythonPath: string;
      scriptPath: string;
      pyprojectPath: string;
    };
    const expectedPythonPath =
      process.platform === 'win32'
        ? path.join(repoRoot, '.env_uv', 'Scripts', 'python.exe')
        : path.join(repoRoot, '.env_uv', 'bin', 'python');
    expect(bridgeInput.envPythonPath).toBe(expectedPythonPath);
    expect(bridgeInput.scriptPath).toBe(
      path.join(
        repoRoot,
        'services',
        'control-api',
        'scripts',
        'crawlers',
        'tiktok_api_capture.py'
      )
    );
    expect(bridgeInput.pyprojectPath).toBe(path.join(repoRoot, 'pyproject.toml'));
    expect(result.sourceCapture.summary).toBe('Captured via TikTokApi bridge');
    expect(result.collectionLogs).toHaveLength(1);
    expect(result.collectionLogs[0]).toMatchObject({
      topicRunId: plan.capturePlan.topicRunId,
      captureId: result.sourceCapture.id,
      step: 'capture',
      status: 'success'
    });
  });

  it('fails explicitly when cookie or account runtime secrets are missing', async () => {
    const runner = createTikTokApiRunner({
      runBridge: vi.fn(async () => '{"status":"success","summary":"ok"}')
    });

    await expect(
      runner(
        createExecutionPlan({
          accounts: [],
          cookies: []
        })
      )
    ).rejects.toThrow(/requires accountRef and sessionRef/i);
  });

  it('fails explicitly when bridge returns malformed JSON', async () => {
    let materializedDir = '';
    const runner = createTikTokApiRunner({
      runBridge: vi.fn(async (request: { inputJson: string }) => {
        const payload = JSON.parse(request.inputJson) as {
          auth: {
            accountFilePath: string;
          };
        };
        materializedDir = path.dirname(payload.auth.accountFilePath);
        return '{not-json';
      })
    });

    await expect(runner(createExecutionPlan())).rejects.toThrow(
      /malformed json/i
    );
    expect(materializedDir).not.toBe('');
    expect(existsSync(materializedDir)).toBe(false);
  });

  it('fails explicitly when bridge returns status=error payload', async () => {
    const runner = createTikTokApiRunner({
      runBridge: vi.fn(async () =>
        JSON.stringify({
          status: 'error',
          error: 'session expired'
        })
      )
    });

    await expect(runner(createExecutionPlan())).rejects.toThrow(/session expired/i);
  });

  it('kills hanging bridge process on timeout and fails explicitly', async () => {
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), 'openfons-tiktok-timeout-'));
    const pythonPath =
      process.platform === 'win32'
        ? path.join(repoRoot, '.env_uv', 'Scripts', 'python.exe')
        : path.join(repoRoot, '.env_uv', 'bin', 'python');
    const scriptPath = path.join(
      repoRoot,
      'services',
      'control-api',
      'scripts',
      'crawlers',
      'tiktok_api_capture.py'
    );
    mkdirSync(path.dirname(pythonPath), { recursive: true });
    mkdirSync(path.dirname(scriptPath), { recursive: true });
    writeFileSync(path.join(repoRoot, 'pyproject.toml'), '[project]\nname = "t"\n', 'utf8');
    writeFileSync(pythonPath, '', 'utf8');
    writeFileSync(scriptPath, '', 'utf8');

    const killSpy = vi.fn();
    const spawnImpl = vi.fn(() => {
      const emitter = new EventEmitter();
      const child = Object.assign(emitter, {
        stdout: new PassThrough(),
        stderr: new PassThrough(),
        stdin: new PassThrough(),
        kill: killSpy
      });

      return child;
    });
    const runBridge = createDefaultTikTokApiBridgeRunner({
      timeoutMs: 20,
      spawnImpl
    });

    await expect(
      runBridge({
        repoRoot,
        pyprojectPath: path.join(repoRoot, 'pyproject.toml'),
        envPythonPath: pythonPath,
        scriptPath,
        inputJson: '{}'
      })
    ).rejects.toThrow(/timed out/i);
    expect(killSpy).toHaveBeenCalled();
  });
});
