import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { OpportunityInput, ReportView } from '@openfons/contracts';
import { buildAiProcurementCase } from '../cases/ai-procurement.js';
import { buildCompilation, buildOpportunity } from '../compiler.js';

export const DIRECT_API_VS_OPENROUTER_INPUT: OpportunityInput = {
  title: 'Direct API vs OpenRouter for AI Coding Teams',
  query: 'direct api vs openrouter',
  market: 'global',
  audience: 'small ai teams',
  problem: 'Teams need cheaper but reliable model procurement',
  outcome: 'Produce a source-backed report',
  geo: 'global',
  language: 'English'
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const resolveLang = (language: string): string => {
  const normalized = language.trim().toLowerCase();

  if (normalized.startsWith('zh')) {
    return 'zh-CN';
  }

  if (normalized.startsWith('en')) {
    return 'en';
  }

  return 'en';
};

const renderClaims = (reportView: ReportView): string => {
  const evidenceById = new Map(
    reportView.evidenceSet.items.map((item) => [item.id, item] as const)
  );

  return reportView.report.claims
    .map((claim) => {
      const evidence = claim.evidenceIds
        .map((evidenceId) => evidenceById.get(evidenceId))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map(
          (item) =>
            `<li><strong>${escapeHtml(item.kind)}</strong>: ${escapeHtml(item.statement)}</li>`
        )
        .join('');

      return `
        <article class="stack card claim-card">
          <p class="kicker">Claim</p>
          <h3>${escapeHtml(claim.label)}</h3>
          <p>${escapeHtml(claim.statement)}</p>
          <ul class="bullet-list compact-list">
            ${evidence}
          </ul>
        </article>
      `;
    })
    .join('');
};

const renderSources = (reportView: ReportView): string =>
  reportView.report.sourceIndex
    .map((source) => {
      const capture = reportView.sourceCaptures.find(
        (item) => item.id === source.captureId
      );

      return `
        <article class="stack card source-card">
          <p class="kicker">${escapeHtml(source.sourceKind)}</p>
          <h3>
            <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">
              ${escapeHtml(source.title)}
            </a>
          </h3>
          <p>${capture ? escapeHtml(capture.summary) : 'Source captured during the run.'}</p>
          <p class="meta">
            ${escapeHtml(source.useAs)} / ${escapeHtml(source.reportability)} / ${escapeHtml(source.riskLevel)}
          </p>
          <p class="meta">Last checked: ${escapeHtml(source.lastCheckedAt)}</p>
        </article>
      `;
    })
    .join('');

const renderEvidence = (reportView: ReportView): string =>
  reportView.evidenceSet.items
    .map(
      (item) => `
        <article class="stack card evidence-card">
          <p class="kicker">${escapeHtml(item.kind)}</p>
          <p>${escapeHtml(item.statement)}</p>
          <p class="meta">Freshness: ${escapeHtml(item.freshnessNote)}</p>
        </article>
      `
    )
    .join('');

const renderSections = (reportView: ReportView): string =>
  reportView.report.sections
    .map(
      (section) => `
        <article class="stack narrative-card">
          <h3>${escapeHtml(section.title)}</h3>
          <p>${escapeHtml(section.body)}</p>
        </article>
      `
    )
    .join('');

const renderStringList = (items: string[]): string =>
  items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

const renderLogs = (reportView: ReportView): string =>
  reportView.collectionLogs
    .map(
      (log) => `
        <li>
          <strong>${escapeHtml(log.step)}</strong> / ${escapeHtml(log.status)}:
          ${escapeHtml(log.message)}
        </li>
      `
    )
    .join('');

export type StaticReportHtmlOptions = {
  eyebrow?: string;
  narrativeTitle?: string;
  narrativeMeta?: string;
  sourcesMeta?: string;
  footerNote?: string;
  includeCollectionLogs?: boolean;
};

const DEFAULT_STATIC_REPORT_HTML_OPTIONS: Required<StaticReportHtmlOptions> = {
  eyebrow: 'OpenFons Evidence Report',
  narrativeTitle: 'Decision Guide',
  narrativeMeta: 'Decision points backed by the compiled evidence set',
  sourcesMeta: 'Official and corroborating references',
  footerNote: 'Generated from the OpenFons evidence-backed report pipeline.',
  includeCollectionLogs: false
};

export const renderStaticReportHtml = (
  reportView: ReportView,
  options: StaticReportHtmlOptions = {}
): string => {
  const { report } = reportView;
  const resolvedOptions = {
    ...DEFAULT_STATIC_REPORT_HTML_OPTIONS,
    ...options
  };
  const collectionLogDetails = resolvedOptions.includeCollectionLogs
    ? `
        <details>
          <summary>Capture Log</summary>
          <ul class="bullet-list compact-list">
            ${renderLogs(reportView)}
          </ul>
        </details>`
    : '';

  return `<!doctype html>
<html lang="${escapeHtml(resolveLang(report.language))}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(report.title)}</title>
    <meta name="description" content="${escapeHtml(report.summary)}" />
    <style>
      :root {
        color-scheme: light;
        --bg: #f3eadc;
        --paper: rgba(255, 252, 247, 0.95);
        --ink: #1f1b16;
        --muted: #6d5947;
        --line: rgba(78, 55, 31, 0.14);
        --accent: #8c4b1f;
        --accent-soft: #e4c4aa;
        --shadow: 0 24px 60px rgba(49, 31, 14, 0.12);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(140, 75, 31, 0.16), transparent 30%),
          linear-gradient(180deg, #f7f1e7 0%, var(--bg) 100%);
      }

      a {
        color: inherit;
      }

      .page {
        width: min(1180px, calc(100% - 32px));
        margin: 0 auto;
        padding: 32px 0 56px;
      }

      .hero {
        background: linear-gradient(135deg, rgba(255, 251, 245, 0.96), rgba(247, 236, 223, 0.96));
        border: 1px solid var(--line);
        border-radius: 28px;
        padding: 32px;
        box-shadow: var(--shadow);
      }

      .hero-grid,
      .detail-grid,
      .summary-grid {
        display: grid;
        gap: 18px;
      }

      .hero-grid {
        grid-template-columns: minmax(0, 1.8fr) minmax(280px, 0.9fr);
        align-items: start;
      }

      .detail-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 24px;
      }

      .summary-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        margin-top: 16px;
      }

      .panel,
      .card,
      .narrative-card {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 22px;
        box-shadow: var(--shadow);
      }

      .panel,
      .card {
        padding: 22px;
      }

      .narrative-card {
        padding: 24px;
      }

      .stack > * + * {
        margin-top: 12px;
      }

      .eyebrow,
      .kicker {
        margin: 0;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--accent);
      }

      h1,
      h2,
      h3,
      p,
      ul {
        margin: 0;
      }

      h1 {
        font-size: clamp(2rem, 4vw, 3.4rem);
        line-height: 1.05;
      }

      h2 {
        font-size: 1.4rem;
      }

      h3 {
        font-size: 1.06rem;
      }

      p,
      li {
        line-height: 1.7;
      }

      .lede {
        font-size: 1.05rem;
        color: var(--muted);
      }

      .thesis {
        padding: 16px 18px;
        border-left: 4px solid var(--accent);
        background: rgba(228, 196, 170, 0.22);
      }

      .meta {
        color: var(--muted);
        font-size: 0.93rem;
      }

      .summary-chip {
        padding: 16px 18px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid var(--line);
        border-radius: 18px;
      }

      .summary-chip strong {
        display: block;
        margin-bottom: 6px;
        font-size: 0.84rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--accent);
      }

      section {
        margin-top: 24px;
      }

      .section-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 14px;
      }

      .bullet-list {
        padding-left: 20px;
      }

      .compact-list {
        margin-top: 10px;
      }

      .narrative-grid,
      .card-grid {
        display: grid;
        gap: 18px;
      }

      .narrative-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .card-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      details {
        margin-top: 20px;
      }

      details summary {
        cursor: pointer;
        font-weight: 700;
      }

      .footer-note {
        margin-top: 28px;
        text-align: center;
        color: var(--muted);
        font-size: 0.92rem;
      }

      @media (max-width: 900px) {
        .hero-grid,
        .detail-grid,
        .summary-grid,
        .narrative-grid,
        .card-grid {
          grid-template-columns: 1fr;
        }

        .page {
          width: min(100% - 20px, 1180px);
        }

        .hero,
        .panel,
        .card,
        .narrative-card {
          padding: 20px;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="hero">
        <div class="hero-grid">
          <div class="stack">
            <p class="eyebrow">${escapeHtml(resolvedOptions.eyebrow)}</p>
            <h1>${escapeHtml(report.title)}</h1>
            <p class="lede">${escapeHtml(report.summary)}</p>
            <p class="thesis">${escapeHtml(report.thesis)}</p>
          </div>
          <aside class="panel stack">
            <div class="summary-chip">
              <strong>Audience</strong>
              ${escapeHtml(report.audience)}
            </div>
            <div class="summary-chip">
              <strong>Geo / Language</strong>
              ${escapeHtml(report.geo)} / ${escapeHtml(report.language)}
            </div>
            <div class="summary-chip">
              <strong>Updated</strong>
              ${escapeHtml(report.updatedAt)}
            </div>
          </aside>
        </div>
        <div class="summary-grid">
          <div class="summary-chip">
            <strong>Claims</strong>
            ${report.claims.length}
          </div>
          <div class="summary-chip">
            <strong>Sources</strong>
            ${report.sourceIndex.length}
          </div>
          <div class="summary-chip">
            <strong>Evidence Items</strong>
            ${reportView.evidenceSet.items.length}
          </div>
        </div>
      </header>

      <section>
        <div class="section-head">
          <h2>${escapeHtml(resolvedOptions.narrativeTitle)}</h2>
          <p class="meta">${escapeHtml(resolvedOptions.narrativeMeta)}</p>
        </div>
        <div class="narrative-grid">
          ${renderSections(reportView)}
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2>Claims</h2>
          <p class="meta">Each claim stays attached to report evidence</p>
        </div>
        <div class="card-grid">
          ${renderClaims(reportView)}
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2>Sources</h2>
          <p class="meta">${escapeHtml(resolvedOptions.sourcesMeta)}</p>
        </div>
        <div class="card-grid">
          ${renderSources(reportView)}
        </div>
      </section>

      <section>
        <div class="section-head">
          <h2>Evidence</h2>
          <p class="meta">Freshness notes stay visible in the exported page</p>
        </div>
        <div class="card-grid">
          ${renderEvidence(reportView)}
        </div>
      </section>

      <section class="detail-grid">
        <article class="panel stack">
          <h2>Evidence Boundaries</h2>
          <ul class="bullet-list">
            ${renderStringList(report.evidenceBoundaries)}
          </ul>
        </article>
        <article class="panel stack">
          <h2>Risks</h2>
          <ul class="bullet-list">
            ${renderStringList(report.risks)}
          </ul>
        </article>
      </section>

      <section class="panel stack">
        <h2>Update Log</h2>
        <ul class="bullet-list">
          ${renderStringList(
            report.updateLog.map((item) => `${item.at} - ${item.note}`)
          )}
        </ul>
        ${collectionLogDetails}
      </section>

      <p class="footer-note">
        ${escapeHtml(resolvedOptions.footerNote)}
      </p>
    </main>
  </body>
</html>`;
};

export const buildDirectApiVsOpenRouterReportView = async (): Promise<ReportView> => {
  const opportunity = buildOpportunity(DIRECT_API_VS_OPENROUTER_INPUT);
  const compiled = await buildCompilation(opportunity, {
    buildAiProcurementCaseBundle: async (nextOpportunity, workflow) =>
      buildAiProcurementCase(nextOpportunity, workflow)
  });

  return {
    report: compiled.report,
    evidenceSet: compiled.evidenceSet,
    sourceCaptures: compiled.sourceCaptures,
    collectionLogs: compiled.collectionLogs
  };
};

export const exportDirectApiVsOpenRouterWorkbenchHtml = async (
  outputPath: string
): Promise<string> => {
  const reportView = await buildDirectApiVsOpenRouterReportView();
  const html = renderStaticReportHtml(reportView, {
    eyebrow: 'AI Procurement Decision Guide',
    narrativeTitle: 'Decision Guide',
    narrativeMeta: 'When direct APIs win, when OpenRouter wins, and what risks stay visible',
    sourcesMeta: 'Official and corroborating references',
    footerNote:
      'Generated from OpenFons evidence for an SEO-ready AI procurement decision page.'
  });

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, 'utf8');

  return html;
};
