import { execFile, type ExecFileOptionsWithStringEncoding } from 'node:child_process'

const DEFAULT_MAX_BUFFER = 25 * 1024 * 1024

export type ExecFileLike = (
  file: string,
  args: readonly string[],
  options: ExecFileOptionsWithStringEncoding,
  callback: (error: Error | null, stdout: string, stderr: string) => void
) => void

export const YT_DLP_HOST_COMMAND_CANDIDATES = ['yt-dlp', 'yt-dlp.exe'] as const

export const getYtDlpCommandCandidates = (
  env: NodeJS.ProcessEnv = process.env
): string[] => [
  env.OPENFONS_YT_DLP_PATH,
  ...YT_DLP_HOST_COMMAND_CANDIDATES
].filter((candidate): candidate is string => Boolean(candidate))

export const runCommandWithCandidates = async ({
  commandLabel,
  candidates,
  args,
  execFileImpl = execFile
}: {
  commandLabel: string
  candidates: string[]
  args: string[]
  execFileImpl?: ExecFileLike
}) => {
  let lastError: Error | undefined

  for (const candidate of candidates) {
    try {
      const stdout = await new Promise<string>((resolve, reject) => {
        execFileImpl(
          candidate,
          args,
          {
            windowsHide: true,
            maxBuffer: DEFAULT_MAX_BUFFER,
            encoding: 'utf8'
          },
          (error, stdoutText, stderrText) => {
            if (!error) {
              resolve(stdoutText)
              return
            }

            const details = stderrText.trim() || error.message
            reject(new Error(`${candidate} failed: ${details}`))
          }
        )
      })

      if (stdout.trim().length > 0) {
        return {
          stdout,
          command: candidate
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw (
    lastError ??
    new Error(`${commandLabel} command candidates did not produce output`)
  )
}

export const resolveProxyEndpoint = (proxyRuntime: unknown): string | undefined => {
  if (!proxyRuntime || typeof proxyRuntime !== 'object') {
    return undefined
  }

  const runtime = proxyRuntime as {
    secrets?: {
      poolRef?: {
        value?: unknown
      }
    }
  }
  const pool = runtime.secrets?.poolRef?.value

  if (!Array.isArray(pool)) {
    return undefined
  }

  for (const item of pool) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const endpoint = (item as { endpoint?: unknown }).endpoint

    if (typeof endpoint === 'string' && endpoint.trim().length > 0) {
      return endpoint.trim()
    }
  }

  return undefined
}
