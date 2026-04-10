import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { CapturePlan } from '../capture-runner.js'
import { createId } from '@openfons/shared'
import { createCrawlerExecutionDispatcher } from './dispatcher.js'
import { resolveExecutableCrawlerRouteForUrl } from './runtime.js'
import { createTikTokApiRunner } from './tiktok-api-runner.js'
import { createYtDlpRunner } from './yt-dlp-runner.js'

export type SmokeRoute = 'youtube' | 'tiktok'

type SmokeTarget = Omit<CapturePlan, 'topicRunId' | 'snippet'>
type SmokeTargetMetadata = Omit<SmokeTarget, 'url'>

const SMOKE_URL_DEFAULTS: Record<SmokeRoute, string> = {
  youtube: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  tiktok: 'https://www.tiktok.com/@scout2015'
}

const SMOKE_TARGET_METADATA: Record<SmokeRoute, SmokeTargetMetadata> = {
  youtube: {
    title: 'YouTube smoke capture',
    sourceKind: 'official',
    useAs: 'primary',
    reportability: 'reportable',
    riskLevel: 'low',
    captureType: 'doc-page',
    language: 'en',
    region: 'global'
  },
  tiktok: {
    title: 'TikTok smoke capture',
    sourceKind: 'official',
    useAs: 'primary',
    reportability: 'reportable',
    riskLevel: 'low',
    captureType: 'doc-page',
    language: 'en',
    region: 'global'
  }
}

const getSmokeUrl = (route: SmokeRoute) => {
  if (route === 'youtube') {
    return process.env.OPENFONS_SMOKE_YOUTUBE_URL ?? SMOKE_URL_DEFAULTS.youtube
  }

  return process.env.OPENFONS_SMOKE_TIKTOK_URL ?? SMOKE_URL_DEFAULTS.tiktok
}

const buildSmokeTarget = (route: SmokeRoute): SmokeTarget => ({
  ...SMOKE_TARGET_METADATA[route],
  url: getSmokeUrl(route)
})

type DispatcherFactory = () => ReturnType<typeof createCrawlerExecutionDispatcher>

export const runCrawlerExecutionSmoke = async ({
  route,
  repoRoot = process.cwd(),
  secretRoot = process.env.OPENFONS_SECRET_ROOT,
  outputPath,
  resolveRuntime = resolveExecutableCrawlerRouteForUrl,
  createDispatcher = () =>
    createCrawlerExecutionDispatcher({
      ytDlpRunner: createYtDlpRunner(),
      tiktokApiRunner: createTikTokApiRunner({ repoRoot })
    })
}: {
  route: SmokeRoute
  repoRoot?: string
  secretRoot?: string
  outputPath?: string
  resolveRuntime?: typeof resolveExecutableCrawlerRouteForUrl
  createDispatcher?: DispatcherFactory
}) => {
  if (!secretRoot) {
    throw new Error('OPENFONS_SECRET_ROOT is required for crawler smoke validation')
  }

  const target = buildSmokeTarget(route)
  const runtime = resolveRuntime({
    projectId: 'openfons',
    repoRoot,
    secretRoot,
    url: target.url
  })

  if (!runtime) {
    throw new Error(`no executable crawler runtime resolved for ${route} (${target.url})`)
  }

  if (runtime.routeKey !== route) {
    throw new Error(`resolved route mismatch: expected ${route}, got ${runtime.routeKey}`)
  }

  const dispatcher = createDispatcher()
  let payload:
    | {
        status: 'success'
        route: SmokeRoute
        runtime: {
          routeKey: string
          driver: string
          mode: string
        }
        sourceCapture: unknown
        collectionLogs: unknown[]
      }
    | {
        status: 'error'
        route: SmokeRoute
        runtime: {
          routeKey: string
          driver: string
          mode: string
        }
        error: string
      }

  const capturePlan: CapturePlan = {
    topicRunId: createId('topic'),
    title: target.title,
    url: target.url,
    snippet: `${route} smoke validation`,
    sourceKind: target.sourceKind,
    useAs: target.useAs,
    reportability: target.reportability,
    riskLevel: target.riskLevel,
    captureType: target.captureType,
    language: target.language,
    region: target.region
  }

  try {
    const result = await dispatcher.run({
      capturePlan,
      runtime
    })

    payload = {
      status: 'success',
      route,
      runtime: {
        routeKey: runtime.routeKey,
        driver: runtime.collection.driver,
        mode: runtime.mode
      },
      sourceCapture: result.sourceCapture,
      collectionLogs: result.collectionLogs
    }
  } catch (error) {
    payload = {
      status: 'error',
      route,
      runtime: {
        routeKey: runtime.routeKey,
        driver: runtime.collection.driver,
        mode: runtime.mode
      },
      error: error instanceof Error ? error.message : String(error)
    }
  }

  if (outputPath) {
    mkdirSync(path.dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8')
  }

  return payload
}
