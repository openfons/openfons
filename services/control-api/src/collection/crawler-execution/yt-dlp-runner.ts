import { createCollectionLog, createSourceCapture } from '@openfons/domain-models'
import type { CrawlerExecutionRunner } from './types.js'
import {
  getYtDlpCommandCandidates,
  resolveProxyEndpoint,
  runCommandWithCandidates,
  type ExecFileLike
} from './tooling.js'

const YT_DLP_ARGS = ['--dump-single-json', '--no-warnings', '--skip-download']

const buildYtDlpSummary = ({
  payload,
  fallbackSummary
}: {
  payload: Record<string, unknown>
  fallbackSummary: string
}) => {
  const title =
    typeof payload.title === 'string' && payload.title.trim().length > 0
      ? payload.title.trim()
      : undefined
  const description =
    typeof payload.description === 'string' && payload.description.trim().length > 0
      ? payload.description.trim()
      : undefined
  const uploader =
    typeof payload.uploader === 'string' && payload.uploader.trim().length > 0
      ? payload.uploader.trim()
      : undefined

  const summary = [title, description, uploader].filter(Boolean).join(' | ')

  if (summary.length > 0) {
    return summary.slice(0, 220)
  }

  return fallbackSummary
}

export const createYtDlpRunner = ({
  commandCandidates = getYtDlpCommandCandidates(),
  execFileImpl
}: {
  commandCandidates?: string[]
  execFileImpl?: ExecFileLike
} = {}): CrawlerExecutionRunner => async (plan) => {
  const proxyEndpoint = resolveProxyEndpoint(plan.runtime.proxy)

  if (plan.runtime.proxy && !proxyEndpoint) {
    throw new Error(
      `yt-dlp execution failed for ${plan.capturePlan.url}: proxy endpoint is required but missing`
    )
  }

  let stdout: string
  let command: string

  try {
    const result = await runCommandWithCandidates({
      commandLabel: 'yt-dlp',
      candidates: commandCandidates,
      args: [
        ...YT_DLP_ARGS,
        ...(proxyEndpoint ? ['--proxy', proxyEndpoint] : []),
        plan.capturePlan.url
      ],
      execFileImpl
    })
    stdout = result.stdout
    command = result.command
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    throw new Error(
      `yt-dlp execution failed for ${plan.capturePlan.url}: ${details}`
    )
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(stdout)
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    throw new Error(
      `yt-dlp returned malformed JSON for ${plan.capturePlan.url}: ${details}`
    )
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      `invalid yt-dlp json payload for ${plan.capturePlan.url}: expected object`
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
    summary: buildYtDlpSummary({
      payload: parsed as Record<string, unknown>,
      fallbackSummary: plan.capturePlan.snippet || plan.capturePlan.title
    })
  })

  return {
    sourceCapture,
    collectionLogs: [
      createCollectionLog({
        topicRunId: plan.capturePlan.topicRunId,
        captureId: sourceCapture.id,
        step: 'capture',
        status: 'success',
        message: `Captured ${sourceCapture.title} via yt-dlp (${command})`
      })
    ]
  }
}
