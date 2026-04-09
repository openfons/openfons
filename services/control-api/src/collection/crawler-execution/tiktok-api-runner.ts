import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createCollectionLog, createSourceCapture } from '@openfons/domain-models'
import type { CrawlerExecutionRunner } from './types.js'
import { resolveProxyEndpoint } from './tooling.js'

const UV_COMMAND_CANDIDATES = ['uv', 'uv.exe'] as const
const DEFAULT_BRIDGE_TIMEOUT_MS = 90_000

export type TikTokApiBridgeRequest = {
  repoRoot: string
  pyprojectPath: string
  envPythonPath: string
  scriptPath: string
  inputJson: string
}

export type TikTokApiBridgeRunner = (
  request: TikTokApiBridgeRequest
) => Promise<string>

type SpawnLike = (
  command: string,
  args: readonly string[],
  options: {
    windowsHide: boolean
    stdio: ['pipe', 'pipe', 'pipe']
  }
) => ChildProcessWithoutNullStreams

class BridgeTimeoutError extends Error {
  readonly command: string

  constructor(command: string, timeoutMs: number) {
    super(`tiktok-api bridge timed out after ${timeoutMs}ms`)
    this.name = 'BridgeTimeoutError'
    this.command = command
  }
}

const resolveEnvPythonPath = (repoRoot: string) =>
  process.platform === 'win32'
    ? path.join(repoRoot, '.env_uv', 'Scripts', 'python.exe')
    : path.join(repoRoot, '.env_uv', 'bin', 'python')

const assertFileExists = ({
  filePath,
  label
}: {
  filePath: string
  label: string
}) => {
  if (!existsSync(filePath)) {
    throw new Error(`tiktok-api bridge launch failed: missing ${label} at ${filePath}`)
  }
}

const readAccountRuntime = (accounts: unknown[]) => {
  if (accounts.length === 0) {
    return undefined
  }

  const first = accounts[0] as {
    secrets?: {
      accountRef?: {
        value?: unknown
      }
    }
  }

  return first.secrets?.accountRef?.value
}

const readCookieRuntime = (cookies: unknown[]) => {
  if (cookies.length === 0) {
    return undefined
  }

  const first = cookies[0] as {
    secrets?: {
      sessionRef?: {
        value?: unknown
      }
    }
  }
  const value = first.secrets?.sessionRef?.value

  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim()

  return normalized.length > 0 ? normalized : undefined
}

export const createDefaultTikTokApiBridgeRunner = ({
  timeoutMs = DEFAULT_BRIDGE_TIMEOUT_MS,
  spawnImpl = spawn
}: {
  timeoutMs?: number
  spawnImpl?: SpawnLike
} = {}): TikTokApiBridgeRunner => async ({
  repoRoot,
  pyprojectPath,
  envPythonPath,
  scriptPath,
  inputJson
}) => {
  assertFileExists({ filePath: pyprojectPath, label: 'pyproject.toml' })
  assertFileExists({ filePath: envPythonPath, label: '.env_uv python executable' })
  assertFileExists({ filePath: scriptPath, label: 'bridge script' })

  const commandCandidates = [
    process.env.OPENFONS_UV_PATH,
    ...UV_COMMAND_CANDIDATES
  ].filter((candidate): candidate is string => Boolean(candidate))
  const args = [
    'run',
    '--project',
    repoRoot,
    '--python',
    envPythonPath,
    scriptPath
  ]

  let lastError: Error | undefined

  for (const command of commandCandidates) {
    try {
      return await new Promise<string>((resolve, reject) => {
        const child = spawnImpl(command, args, {
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe']
        })
        let settled = false
        let stdoutText = ''
        let stderrText = ''
        const timeoutId = setTimeout(() => {
          if (settled) {
            return
          }

          settled = true
          child.kill()
          reject(new BridgeTimeoutError(command, timeoutMs))
        }, timeoutMs)
        const settle = (fn: () => void) => {
          if (settled) {
            return
          }

          settled = true
          clearTimeout(timeoutId)
          fn()
        }

        child.stdout.setEncoding('utf8')
        child.stdout.on('data', (chunk) => {
          stdoutText += chunk
        })
        child.stderr.setEncoding('utf8')
        child.stderr.on('data', (chunk) => {
          stderrText += chunk
        })
        child.on('error', (error) => {
          settle(() => {
            reject(new Error(`${command} failed: ${error.message}`))
          })
        })
        child.on('close', (code) => {
          settle(() => {
            if (code === 0) {
              resolve(stdoutText)
              return
            }

            const details = stderrText.trim() || `process exited with code ${code}`
            reject(new Error(`${command} failed: ${details}`))
          })
        })
        child.stdin.end(inputJson, 'utf8')
      })
    } catch (error) {
      if (error instanceof BridgeTimeoutError) {
        throw error
      }

      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw (
    lastError ??
    new Error('tiktok-api bridge launch failed: uv command candidates did not execute')
  )
}

export const createTikTokApiRunner = ({
  repoRoot = process.cwd(),
  runBridge = createDefaultTikTokApiBridgeRunner()
}: {
  repoRoot?: string
  runBridge?: TikTokApiBridgeRunner
} = {}): CrawlerExecutionRunner => async (plan) => {
  const accountValue = readAccountRuntime(plan.runtime.accounts)
  const sessionValue = readCookieRuntime(plan.runtime.cookies)

  if (!accountValue || !sessionValue) {
    throw new Error(
      `tiktok-api execution failed for ${plan.capturePlan.url}: requires accountRef and sessionRef runtime secrets`
    )
  }

  const proxyEndpoint = resolveProxyEndpoint(plan.runtime.proxy)

  if (plan.runtime.proxy && !proxyEndpoint) {
    throw new Error(
      `tiktok-api execution failed for ${plan.capturePlan.url}: proxy endpoint is required but missing`
    )
  }

  const pyprojectPath = path.join(repoRoot, 'pyproject.toml')
  const envPythonPath = resolveEnvPythonPath(repoRoot)
  const scriptPath = path.join(
    repoRoot,
    'services',
    'control-api',
    'scripts',
    'crawlers',
    'tiktok_api_capture.py'
  )
  const materializedDir = mkdtempSync(path.join(os.tmpdir(), 'openfons-tiktok-api-'))

  try {
    const accountFilePath = path.join(materializedDir, 'account.json')
    const cookieFilePath = path.join(materializedDir, 'cookie.txt')

    writeFileSync(accountFilePath, JSON.stringify(accountValue, null, 2), 'utf8')
    writeFileSync(cookieFilePath, sessionValue, 'utf8')

    const bridgeInput = {
      topicRunId: plan.capturePlan.topicRunId,
      url: plan.capturePlan.url,
      title: plan.capturePlan.title,
      snippet: plan.capturePlan.snippet,
      auth: {
        accountFilePath,
        cookieFilePath
      },
      proxy: proxyEndpoint
        ? {
            endpoint: proxyEndpoint
          }
        : undefined
    }

    let bridgeStdout: string

    try {
      bridgeStdout = await runBridge({
        repoRoot,
        pyprojectPath,
        envPythonPath,
        scriptPath,
        inputJson: JSON.stringify(bridgeInput)
      })
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error)
      throw new Error(
        `tiktok-api execution failed for ${plan.capturePlan.url}: ${details}`
      )
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(bridgeStdout)
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error)
      throw new Error(
        `tiktok-api bridge returned malformed JSON for ${plan.capturePlan.url}: ${details}`
      )
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(
        `invalid tiktok-api bridge payload for ${plan.capturePlan.url}: expected object`
      )
    }

    const payload = parsed as {
      status?: unknown
      summary?: unknown
      error?: unknown
    }

    if (payload.status !== 'success') {
      throw new Error(
        `tiktok-api bridge failed for ${plan.capturePlan.url}: ${String(payload.error ?? 'unknown bridge error')}`
      )
    }

    if (typeof payload.summary !== 'string' || payload.summary.trim().length === 0) {
      throw new Error(
        `invalid tiktok-api bridge payload for ${plan.capturePlan.url}: summary is required`
      )
    }

    const sourceCapture = createSourceCapture({
      topicRunId: plan.capturePlan.topicRunId,
      title: plan.capturePlan.title,
      url: plan.capturePlan.url,
      sourceKind: plan.capturePlan.sourceKind,
      useAs: plan.capturePlan.useAs,
      reportability: plan.capturePlan.reportability,
      riskLevel: plan.capturePlan.riskLevel,
      captureType: plan.capturePlan.captureType,
      language: plan.capturePlan.language,
      region: plan.capturePlan.region,
      summary: payload.summary.trim()
    })

    return {
      sourceCapture,
      collectionLogs: [
        createCollectionLog({
          topicRunId: plan.capturePlan.topicRunId,
          captureId: sourceCapture.id,
          step: 'capture',
          status: 'success',
          message: `Captured ${sourceCapture.title} via tiktok-api bridge`
        })
      ]
    }
  } finally {
    rmSync(materializedDir, { recursive: true, force: true })
  }
}
