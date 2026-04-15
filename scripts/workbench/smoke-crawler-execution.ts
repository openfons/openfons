import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runCrawlerExecutionSmoke, type SmokeRoute } from '../../services/control-api/src/collection/crawler-execution/smoke.js'

const parseArgs = (args: string[] = process.argv.slice(2)) => {
  const routeIndex = args.indexOf('--route')
  const outIndex = args.indexOf('--out')

  const route = args[routeIndex + 1] as SmokeRoute | undefined
  let outputPath: string | undefined

  if (
    !route ||
    (route !== 'youtube' && route !== 'tiktok' && route !== 'hacker-news')
  ) {
    throw new Error(
      'usage: --route youtube|tiktok|hacker-news [--out relative/path.json]'
    )
  }

  if (outIndex >= 0) {
    const rawOut = args[outIndex + 1]

    if (!rawOut) {
      throw new Error('missing path after --out')
    }

    outputPath = path.resolve(process.cwd(), rawOut)
  }

  return { route, outputPath }
}

export const runSmokeCommand = async ({
  args,
  exitHandler = (code: number) => {
    process.exitCode = code
  }
}: {
  args?: string[]
  exitHandler?: (code: number) => void
} = {}) => {
  const { route, outputPath } = parseArgs(args)
  const result = await runCrawlerExecutionSmoke({ route, outputPath })
  console.log(JSON.stringify(result, null, 2))

  if (result.status === 'error') {
    exitHandler(1)
  }

  return result
}

const main = async () => {
  try {
    await runSmokeCommand()
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
