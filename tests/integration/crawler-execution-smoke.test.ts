import { describe, expect, it, vi } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const DEFAULT_YOUTUBE_SMOKE_URL = 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'
const DEFAULT_HACKER_NEWS_SMOKE_URL = 'https://news.ycombinator.com/item?id=8863'

const buildRuntime = (url = DEFAULT_YOUTUBE_SMOKE_URL) => ({
  projectId: 'openfons',
  routeKey: 'youtube',
  mode: 'public-first',
  collection: {
    pluginId: 'youtube-adapter',
    type: 'crawler-adapter',
    driver: 'yt-dlp',
    config: {},
    secrets: {}
  },
  browser: undefined,
  accounts: [],
  cookies: [],
  proxy: {
    pluginId: 'global-proxy-pool',
    type: 'proxy-source',
    driver: 'static-proxy-file',
    config: {},
    secrets: {
      poolRef: {
        value: [{ endpoint: 'http://proxy.local:9000' }]
      }
    }
  }
})

const createSourceCapture = (url = DEFAULT_YOUTUBE_SMOKE_URL) => ({
  id: 'capture_001',
  topicRunId: 'topic_001',
  title: 'YouTube smoke capture',
  url,
  sourceKind: 'official',
  useAs: 'primary',
  reportability: 'reportable',
  riskLevel: 'low',
  captureType: 'doc-page',
  status: 'captured',
  accessedAt: '2026-04-10T00:00:00.000Z',
  language: 'en',
  region: 'global',
  summary: 'Smoke capture completed'
})

const createCollectionLogs = () => [
  {
    id: 'log_001',
    topicRunId: 'topic_001',
    captureId: 'capture_001',
    step: 'capture',
    status: 'success',
    message: 'Captured YouTube smoke capture via yt-dlp',
    createdAt: '2026-04-10T00:00:00.000Z'
  }
]

const loadSmokeHarness = async () => {
  vi.resetModules()

  const module = await import(
    '../../services/control-api/src/collection/crawler-execution/smoke.js'
  )

  return module.runCrawlerExecutionSmoke
}

const createOutputPath = () =>
  path.join(
    os.tmpdir(),
    'openfons-smoke-tests',
    `smoke-${Date.now()}-${Math.random()}.json`
  )

describe('crawler execution smoke harness', () => {
  it('writes the smoke payload to disk when outputPath is provided', async () => {
    const runtime = buildRuntime()
    const resolveRuntime = vi.fn(() => runtime)
    const run = vi.fn(async () => ({
      sourceCapture: createSourceCapture(),
      collectionLogs: createCollectionLogs()
    }))
    const outputPath = createOutputPath()
    const runCrawlerExecutionSmoke = await loadSmokeHarness()

    try {
      const result = await runCrawlerExecutionSmoke({
        route: 'youtube',
        repoRoot: process.cwd(),
        secretRoot: 'C:/secrets',
        outputPath,
        resolveRuntime,
        createDispatcher: () => ({ run })
      })

      const diskPayload = JSON.parse(await fs.readFile(outputPath, 'utf8'))

      expect(diskPayload).toEqual(result)
      expect(diskPayload).toMatchObject({
        status: 'success',
        route: 'youtube',
        runtime: {
          routeKey: 'youtube',
          driver: 'yt-dlp'
        }
      })
      expect(resolveRuntime).toHaveBeenCalledWith(
        expect.objectContaining({
          url: DEFAULT_YOUTUBE_SMOKE_URL
        })
      )
      expect(run).toHaveBeenCalledOnce()
    } finally {
      await fs.rm(outputPath, { force: true })
    }
  })

  it('returns an error payload when the dispatcher throws', async () => {
    const runtime = buildRuntime()
    const resolveRuntime = vi.fn(() => runtime)
    const run = vi.fn(async () => {
      throw new Error('dispatcher failure')
    })
    const runCrawlerExecutionSmoke = await loadSmokeHarness()

    const result = await runCrawlerExecutionSmoke({
      route: 'youtube',
      repoRoot: process.cwd(),
      secretRoot: 'C:/secrets',
      resolveRuntime,
      createDispatcher: () => ({ run })
    })

    expect(result).toMatchObject({
      status: 'error',
      route: 'youtube',
      runtime: {
        routeKey: 'youtube',
        driver: 'yt-dlp',
        mode: 'public-first'
      },
      error: 'dispatcher failure'
    })
    expect(run).toHaveBeenCalledOnce()
  })

  it('writes an error payload when runtime resolution fails before dispatch', async () => {
    const resolveRuntime = vi.fn(() => {
      throw new Error(
        'config-center validation failed for openfons: global-proxy-pool secret poolRef was not found'
      )
    })
    const outputPath = createOutputPath()
    const runCrawlerExecutionSmoke = await loadSmokeHarness()

    try {
      const result = await runCrawlerExecutionSmoke({
        route: 'youtube',
        repoRoot: process.cwd(),
        secretRoot: 'C:/secrets',
        outputPath,
        resolveRuntime
      })

      const diskPayload = JSON.parse(await fs.readFile(outputPath, 'utf8'))

      expect(result).toEqual(diskPayload)
      expect(result).toMatchObject({
        status: 'error',
        route: 'youtube',
        runtime: null,
        error:
          'config-center validation failed for openfons: global-proxy-pool secret poolRef was not found'
      })
    } finally {
      await fs.rm(outputPath, { force: true })
    }
  })

  it('honors OPENFONS_SMOKE_YOUTUBE_URL overrides', async () => {
    const overrideUrl = 'https://override.test/the-smoke'

    process.env.OPENFONS_SMOKE_YOUTUBE_URL = overrideUrl

    try {
      const runtime = buildRuntime(overrideUrl)
      const resolveRuntime = vi.fn(() => runtime)
      const run = vi.fn(async () => ({
        sourceCapture: createSourceCapture(overrideUrl),
        collectionLogs: createCollectionLogs()
      }))
      const runCrawlerExecutionSmoke = await loadSmokeHarness()

      const result = await runCrawlerExecutionSmoke({
        route: 'youtube',
        repoRoot: process.cwd(),
        secretRoot: 'C:/secrets',
        resolveRuntime,
        createDispatcher: () => ({ run })
      })

      expect(resolveRuntime).toHaveBeenCalledWith(
        expect.objectContaining({
          url: overrideUrl
        })
      )
      expect(result.runtime.driver).toBe('yt-dlp')
      expect(result.runtime.routeKey).toBe('youtube')
      expect(result.status).toBe('success')
    } finally {
      delete process.env.OPENFONS_SMOKE_YOUTUBE_URL
    }
  })

  it('sets a non-zero exit code when the CLI reports an error payload', async () => {
    vi.resetModules()
    const exitHandler = vi.fn()
    const mockResult = {
      status: 'error' as const,
      route: 'youtube' as const,
      runtime: {
        routeKey: 'youtube',
        driver: 'yt-dlp',
        mode: 'public-first'
      },
      error: 'dispatcher failure'
    }

    const runCrawlerExecutionSmoke = vi.fn(async () => mockResult)

    vi.doMock('../../services/control-api/src/collection/crawler-execution/smoke.js', () => ({
      runCrawlerExecutionSmoke
    }))

    const { runSmokeCommand } = await import(
      '../../scripts/workbench/smoke-crawler-execution.ts'
    )

    const result = await runSmokeCommand({
      args: ['--route', 'youtube'],
      exitHandler
    })

    expect(runCrawlerExecutionSmoke).toHaveBeenCalled()
    expect(exitHandler).toHaveBeenCalledWith(1)
    expect(result).toBe(mockResult)
  })

  it('supports the Hacker News smoke route and writes a success payload', async () => {
    vi.doUnmock('../../services/control-api/src/collection/crawler-execution/smoke.js')
    const runtime = {
      ...buildRuntime(DEFAULT_HACKER_NEWS_SMOKE_URL),
      routeKey: 'hacker-news',
      collection: {
        pluginId: 'hacker-news-adapter',
        type: 'crawler-adapter',
        driver: 'hacker-news-api',
        config: {},
        secrets: {}
      },
      proxy: undefined
    }
    const resolveRuntime = vi.fn(() => runtime)
    const run = vi.fn(async () => ({
      sourceCapture: createSourceCapture(DEFAULT_HACKER_NEWS_SMOKE_URL),
      collectionLogs: createCollectionLogs()
    }))
    const outputPath = createOutputPath()
    const runCrawlerExecutionSmoke = await loadSmokeHarness()

    try {
      const result = await runCrawlerExecutionSmoke({
        route: 'hacker-news' as any,
        repoRoot: process.cwd(),
        outputPath,
        resolveRuntime,
        createDispatcher: () => ({ run })
      } as any)

      const diskPayload = JSON.parse(await fs.readFile(outputPath, 'utf8'))

      expect(result).toEqual(diskPayload)
      expect(result).toMatchObject({
        status: 'success',
        route: 'hacker-news',
        runtime: {
          routeKey: 'hacker-news',
          driver: 'hacker-news-api'
        }
      })
      expect(resolveRuntime).toHaveBeenCalledWith(
        expect.objectContaining({
          url: DEFAULT_HACKER_NEWS_SMOKE_URL
        })
      )
      expect(run).toHaveBeenCalledOnce()
    } finally {
      await fs.rm(outputPath, { force: true })
    }
  })
})
