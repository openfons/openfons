import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ReportView } from '@openfons/contracts';
import {
  createCollectionLog,
  createEvidenceSet,
  createSourceCapture,
  createTopicRun
} from '@openfons/domain-models';
import { createId, nowIso } from '@openfons/shared';
import { renderStaticReportHtml } from './static-html.js';

const REDEPLOY_REPORT_RELATIVE_PATH =
  'labs/collector-compat/results/redeploy-deployment-report-2026-03-26.md';
const REDEPLOY_BATCH_RELATIVE_DIR =
  'labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored';

type BatchSummary = {
  batch_date: string;
  query: string;
  base_dir: string;
  counts: {
    success_files: number;
    limitations_files: number;
    meta_files: number;
    total_files: number;
  };
  env_checks?: {
    tool_versions?: string;
    smoke_node?: string;
    smoke_python?: string;
  };
  limitations?: Record<string, string | boolean>;
};

type ArtifactEntry = {
  bucket: 'success' | 'limitations' | 'meta';
  filename: string;
  absolutePath: string;
  repoRelativePath: string;
};

const extractMarkdownSection = (markdown: string, heading: string): string => {
  const normalized = markdown.replace(/\r\n/g, '\n');
  const start = normalized.indexOf(heading);

  if (start < 0) {
    return '';
  }

  const bodyStart = normalized.indexOf('\n', start);

  if (bodyStart < 0) {
    return '';
  }

  const nextHeadingOffset = normalized.slice(bodyStart + 1).search(/\n##\s+/);
  const end =
    nextHeadingOffset < 0
      ? normalized.length
      : bodyStart + 1 + nextHeadingOffset;

  return normalized.slice(bodyStart + 1, end).trim();
};

const extractNumberedItems = (markdown: string, heading: string): string[] =>
  extractMarkdownSection(markdown, heading)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^\d+\.\s+/, '').trim());

const normalizePath = (value: string): string => value.replaceAll('\\', '/');

const listArtifactEntries = async (
  repoRoot: string,
  batchRelativeDir: string
): Promise<ArtifactEntry[]> => {
  const buckets: ArtifactEntry['bucket'][] = ['success', 'limitations', 'meta'];
  const entries: ArtifactEntry[] = [];

  for (const bucket of buckets) {
    const bucketDir = resolve(repoRoot, batchRelativeDir, bucket);
    const files = await readdir(bucketDir, { withFileTypes: true });

    for (const file of files) {
      if (!file.isFile()) {
        continue;
      }

      const absolutePath = resolve(bucketDir, file.name);
      const repoRelativePath = normalizePath(
        `${batchRelativeDir}/${bucket}/${file.name}`
      );

      entries.push({
        bucket,
        filename: file.name,
        absolutePath,
        repoRelativePath
      });
    }
  }

  return entries.sort((left, right) =>
    `${left.bucket}/${left.filename}`.localeCompare(
      `${right.bucket}/${right.filename}`
    )
  );
};

const buildCaptureSummary = (entry: ArtifactEntry): string => {
  if (entry.bucket === 'success') {
    return `Real success artifact preserved from the 2026-03-26 redeploy batch. Path: ${entry.repoRelativePath}`;
  }

  if (entry.bucket === 'limitations') {
    return `Real limitation artifact preserved from the 2026-03-26 redeploy batch. Path: ${entry.repoRelativePath}`;
  }

  return `Batch metadata artifact preserved from the 2026-03-26 redeploy batch. Path: ${entry.repoRelativePath}`;
};

const toSourceCaptureInput = (topicRunId: string, entry: ArtifactEntry) => ({
  topicRunId,
  title: entry.filename,
  url: pathToFileURL(entry.absolutePath).href,
  sourceKind: 'inference' as const,
  useAs:
    entry.bucket === 'success'
      ? ('primary' as const)
      : entry.bucket === 'limitations'
        ? ('corroboration' as const)
        : ('secondary' as const),
  reportability:
    entry.bucket === 'limitations'
      ? ('caveated' as const)
      : ('reportable' as const),
  riskLevel:
    entry.bucket === 'limitations'
      ? ('medium' as const)
      : ('low' as const),
  captureType: 'analysis-note' as const,
  language: 'zh-CN',
  region: 'CN',
  summary: buildCaptureSummary(entry)
});

const requireCaptureId = (
  captureIdsByTitle: Map<string, string>,
  filename: string
): string => {
  const captureId = captureIdsByTitle.get(filename);

  if (!captureId) {
    throw new Error(`missing capture for ${filename}`);
  }

  return captureId;
};

const buildEvidenceItems = ({
  topicRunId,
  captureIdsByTitle,
  summary,
  conclusionItems
}: {
  topicRunId: string;
  captureIdsByTitle: Map<string, string>;
  summary: BatchSummary;
  conclusionItems: string[];
}) => {
  const evidenceSet = createEvidenceSet(topicRunId);

  const items = [
    {
      id: createId('evi'),
      topicRunId,
      captureId: requireCaptureId(captureIdsByTitle, 'summary.json'),
      kind: 'inference' as const,
      statement: `The ${summary.batch_date} redeploy batch preserved ${summary.counts.total_files} files, including ${summary.counts.success_files} success artifacts, ${summary.counts.limitations_files} limitation artifacts, and ${summary.counts.meta_files} metadata artifacts.`,
      sourceKind: 'inference' as const,
      useAs: 'primary' as const,
      reportability: 'reportable' as const,
      riskLevel: 'low' as const,
      freshnessNote:
        'Counts were read from meta/summary.json in the preserved redeploy batch.',
      supportingCaptureIds: [
        requireCaptureId(captureIdsByTitle, 'docker_ps.txt'),
        requireCaptureId(captureIdsByTitle, 'tool_versions.txt')
      ]
    },
    {
      id: createId('evi'),
      topicRunId,
      captureId: requireCaptureId(captureIdsByTitle, 'playwright_search.png'),
      kind: 'inference' as const,
      statement:
        conclusionItems[1] ??
        'The redeploy batch shows that browser, search, comment, and public API collection paths can all preserve real artifacts after environment recovery.',
      sourceKind: 'inference' as const,
      useAs: 'primary' as const,
      reportability: 'reportable' as const,
      riskLevel: 'low' as const,
      freshnessNote:
        'This conclusion is backed by preserved success artifacts from search, browser, and API runs.',
      supportingCaptureIds: [
        requireCaptureId(captureIdsByTitle, 'camoufox_search.png'),
        requireCaptureId(captureIdsByTitle, 'crawlee_ddg.json'),
        requireCaptureId(captureIdsByTitle, 'ddgs_search.json'),
        requireCaptureId(captureIdsByTitle, 'amazon_review_summary.json')
      ]
    },
    {
      id: createId('evi'),
      topicRunId,
      captureId: requireCaptureId(captureIdsByTitle, 'yt_dlp_search_raw.txt'),
      kind: 'inference' as const,
      statement:
        conclusionItems[2] ??
        'The batch preserved a real anti-bot failure for yt-dlp, which means YouTube collection still depends on cookies, accounts, or stronger operator conditions.',
      sourceKind: 'inference' as const,
      useAs: 'corroboration' as const,
      reportability: 'caveated' as const,
      riskLevel: 'medium' as const,
      freshnessNote:
        'This limitation is backed by the preserved raw yt-dlp failure output and status JSON.',
      supportingCaptureIds: [
        requireCaptureId(captureIdsByTitle, 'yt_dlp_search_status.json')
      ]
    },
    {
      id: createId('evi'),
      topicRunId,
      captureId: requireCaptureId(captureIdsByTitle, 'praw_without_creds.txt'),
      kind: 'inference' as const,
      statement:
        conclusionItems[3] ??
        'Several high-friction platforms still require credentials, cookies, accounts, or allowlists before they can be treated as stable collection paths.',
      sourceKind: 'inference' as const,
      useAs: 'corroboration' as const,
      reportability: 'caveated' as const,
      riskLevel: 'medium' as const,
      freshnessNote:
        'This conclusion is backed by preserved limitation artifacts for Reddit, TikTok, and token-gated browser service access.',
      supportingCaptureIds: [
        requireCaptureId(captureIdsByTitle, 'reddit_public_json.txt'),
        requireCaptureId(captureIdsByTitle, 'tiktokapi_status.txt'),
        requireCaptureId(captureIdsByTitle, 'pinchtab_host_health.txt'),
        requireCaptureId(captureIdsByTitle, 'pinchtab_nav.txt')
      ]
    }
  ];

  return {
    ...evidenceSet,
    updatedAt: nowIso(),
    items
  };
};

const buildSectionBodies = ({
  summary,
  conclusionItems,
  recommendationItems,
  batchRelativeDir
}: {
  summary: BatchSummary;
  conclusionItems: string[];
  recommendationItems: string[];
  batchRelativeDir: string;
}) => [
  {
    id: createId('sec'),
    title: 'Batch Snapshot',
    body: `Query: ${summary.query}. Batch date: ${summary.batch_date}. Files: ${summary.counts.total_files} total, ${summary.counts.success_files} success, ${summary.counts.limitations_files} limitations, ${summary.counts.meta_files} meta. Root: ${normalizePath(batchRelativeDir)}.`
  },
  {
    id: createId('sec'),
    title: 'What Worked After Redeploy',
    body:
      conclusionItems[1] ??
      'The redeploy batch confirms that search, browser capture, comment extraction, and public API collection all preserved real artifacts after environment recovery.'
  },
  {
    id: createId('sec'),
    title: 'What Still Blocks Reliable Collection',
    body:
      [
        conclusionItems[2],
        conclusionItems[3]
      ]
        .filter(Boolean)
        .join(' ') ||
      'Credential-gated and anti-bot-sensitive tools still need cookies, accounts, proxies, tokens, or allowlists before they can be treated as stable collection paths.'
  },
  {
    id: createId('sec'),
    title: 'Next Controlled Moves',
    body:
      recommendationItems[0] ??
      'Keep the current real artifact batch visible, then use it as the input for the next report-web and SEO-page hardening pass.'
  },
  {
    id: createId('sec'),
    title: 'Environment Snapshot',
    body: [
      summary.env_checks?.tool_versions,
      summary.env_checks?.smoke_node?.split('\n')[0],
      summary.env_checks?.smoke_python?.split('\n')[0]
    ]
      .filter(Boolean)
      .join(' | ')
  }
];

export const buildOpenClawRealArtifactReportView = async (
  repoRoot = process.cwd()
): Promise<ReportView> => {
  const reportMarkdownPath = resolve(repoRoot, REDEPLOY_REPORT_RELATIVE_PATH);
  const summaryPath = resolve(
    repoRoot,
    `${REDEPLOY_BATCH_RELATIVE_DIR}/meta/summary.json`
  );

  const [reportMarkdown, summaryRaw, artifactEntries] = await Promise.all([
    readFile(reportMarkdownPath, 'utf8'),
    readFile(summaryPath, 'utf8'),
    listArtifactEntries(repoRoot, REDEPLOY_BATCH_RELATIVE_DIR)
  ]);

  const summary = JSON.parse(summaryRaw) as BatchSummary;
  const conclusionItems = extractNumberedItems(reportMarkdown, '## 1. 结论先行');
  const recommendationItems = extractNumberedItems(
    reportMarkdown,
    '## 6. 对第一阶段的实际建议'
  );
  const topicRun = createTopicRun(
    'opp-openclaw-real-artifact',
    'wf-openclaw-real-artifact',
    'openclaw-redeploy-real-artifact'
  );

  const sourceCaptures = artifactEntries.map((entry) =>
    createSourceCapture(toSourceCaptureInput(topicRun.id, entry))
  );
  const captureIdsByTitle = new Map(
    sourceCaptures.map((capture) => [capture.title, capture.id] as const)
  );
  const evidenceSet = buildEvidenceItems({
    topicRunId: topicRun.id,
    captureIdsByTitle,
    summary,
    conclusionItems
  });
  const reportCreatedAt = nowIso();

  return {
    report: {
      id: createId('report'),
      opportunityId: 'opp-openclaw-real-artifact',
      slug: 'openclaw-real-artifact-report',
      title: 'OpenClaw Hosting Real Artifact Batch Report',
      summary: `Evidence-backed snapshot from the 2026-03-26 redeploy batch for query "${summary.query}".`,
      audience: 'operators building OpenFons evidence-backed content pages',
      geo: 'CN / global',
      language: 'English',
      thesis:
        'This real artifact batch proves the collection chain can preserve both working outputs and failure evidence, which is the minimum base needed before a formal SEO page.',
      claims: [
        {
          id: createId('claim'),
          label: 'Real batch output exists after redeploy',
          statement:
            conclusionItems[0] ??
            'The 2026-03-26 redeploy batch is the strongest current reference because it preserved a full set of success, limitation, and meta artifacts after environment recovery.',
          evidenceIds: [evidenceSet.items[0].id, evidenceSet.items[1].id]
        },
        {
          id: createId('claim'),
          label: 'Core collection paths produced reusable evidence',
          statement:
            conclusionItems[1] ??
            'Search, browser capture, comments, and public API paths all produced reusable evidence artifacts in the redeploy batch.',
          evidenceIds: [evidenceSet.items[1].id]
        },
        {
          id: createId('claim'),
          label: 'Credential-gated tools remain the main blocker',
          statement:
            `${conclusionItems[2] ?? ''} ${conclusionItems[3] ?? ''}`.trim() ||
            'Credential-gated tools still need cookies, accounts, or allowlists before they can be promoted as stable first-run collection paths.',
          evidenceIds: [evidenceSet.items[2].id, evidenceSet.items[3].id]
        }
      ],
      sourceIndex: sourceCaptures.map((capture) => ({
        captureId: capture.id,
        title: capture.title,
        url: capture.url,
        sourceKind: capture.sourceKind,
        useAs: capture.useAs,
        reportability: capture.reportability,
        riskLevel: capture.riskLevel,
        lastCheckedAt: capture.accessedAt
      })),
      sections: buildSectionBodies({
        summary,
        conclusionItems,
        recommendationItems,
        batchRelativeDir: REDEPLOY_BATCH_RELATIVE_DIR
      }),
      evidenceBoundaries: [
        'This page reports a preserved artifact batch, not a fresh live rerun.',
        'Some artifacts are health checks, fallback captures, or failure logs rather than end-user content pages.',
        'The page proves that evidence was preserved and classified, but it does not yet prove long-term SEO performance.'
      ],
      risks: [
        'Credential-gated platforms still need account, cookie, proxy, token, or allowlist setup before they can be treated as stable.',
        'The report uses one fixed batch and does not yet model recurring updates or canonical query ownership.',
        'Current wording is evidence-backed, but the page is still a transitional report rather than the final SEO surface.'
      ],
      updateLog: [
        {
          at: reportCreatedAt,
          note:
            'Built the first HTML report directly from the preserved 2026-03-26 OpenClaw redeploy artifact batch.'
        }
      ],
      createdAt: reportCreatedAt,
      updatedAt: reportCreatedAt
    },
    evidenceSet,
    sourceCaptures,
    collectionLogs: sourceCaptures.map((capture) =>
      createCollectionLog({
        topicRunId: topicRun.id,
        captureId: capture.id,
        step: 'capture',
        status: 'success',
        message: `Imported preserved ${capture.title} from the redeploy artifact batch`
      })
    )
  };
};

export const exportOpenClawRealArtifactReportHtml = async (
  outputPath: string,
  repoRoot = process.cwd()
): Promise<string> => {
  const reportView = await buildOpenClawRealArtifactReportView(repoRoot);
  const html = renderStaticReportHtml(reportView, {
    eyebrow: 'OpenFons Workbench Export',
    narrativeTitle: 'Quick Narrative',
    narrativeMeta: 'Taken from the compiled report sections',
    sourcesMeta: 'Captured sources and artifact references',
    footerNote: 'Generated from the OpenFons workbench export pipeline.',
    includeCollectionLogs: true
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, 'utf8');

  return html;
};
