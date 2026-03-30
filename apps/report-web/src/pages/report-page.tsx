import { useEffect, useState } from 'react';
import type { ReportView } from '@openfons/contracts';
import { createReportLoader, type ReportLoader } from '../api';

type Props = {
  reportId: string;
  loadReport?: ReportLoader;
};

export const ReportPage = ({
  reportId,
  loadReport = createReportLoader(
    (
      import.meta as ImportMeta & {
        env: Record<string, string | undefined>;
      }
    ).env.VITE_CONTROL_API_BASE_URL ?? 'http://localhost:3001'
  )
}: Props) => {
  const [reportView, setReportView] = useState<ReportView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadReport(reportId)
      .then((next) => {
        if (!cancelled) {
          setReportView(next);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unknown error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadReport, reportId]);

  if (error) {
    return <p className="page-shell">{error}</p>;
  }

  if (!reportView) {
    return <p className="page-shell">Loading report...</p>;
  }

  const { report, evidenceSet, sourceCaptures, collectionLogs } = reportView;
  const evidenceById = new Map(
    evidenceSet.items.map((item) => [item.id, item] as const)
  );

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">OpenFons Evidence-Backed Report</p>
        <h1>{report.title}</h1>
        <p className="meta-line">
          {report.audience} / {report.geo} / {report.language}
        </p>
        <p>{report.summary}</p>
        <p className="thesis">{report.thesis}</p>
        <p className="meta-line">Updated: {report.updatedAt}</p>
      </section>

      <section className="section-card">
        <h2>Claims</h2>
        <ul className="detail-list">
          {report.claims.map((claim) => (
            <li key={claim.id}>
              <strong>{claim.label}</strong>: {claim.statement}
              <div className="inline-ref">
                Evidence:{' '}
                {claim.evidenceIds
                  .map(
                    (evidenceId) =>
                      evidenceById.get(evidenceId)?.statement ?? evidenceId
                  )
                  .join(' | ')}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="section-card">
        <h2>Sources</h2>
        <ul className="detail-list">
          {report.sourceIndex.map((source) => {
            const capture = sourceCaptures.find(
              (item) => item.id === source.captureId
            );

            return (
              <li key={source.captureId}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
                <div className="inline-ref">
                  {source.sourceKind} / {source.useAs} / {source.reportability} /{' '}
                  {source.riskLevel}
                  {capture ? ` / ${capture.captureType}` : ''}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="section-card">
        <h2>Evidence</h2>
        <ul className="detail-list">
          {evidenceSet.items.map((item) => (
            <li key={item.id}>
              <strong>{item.kind}</strong>: {item.statement}
              <div className="inline-ref">Freshness: {item.freshnessNote}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="section-card">
        <h2>Capture Log</h2>
        <ul className="detail-list">
          {collectionLogs.map((log) => (
            <li key={log.id}>
              {log.step} / {log.status} - {log.message}
            </li>
          ))}
        </ul>
      </section>

      {report.sections.map((section) => (
        <article className="section-card" key={section.id}>
          <h2>{section.title}</h2>
          <p>{section.body}</p>
        </article>
      ))}

      <section className="section-card">
        <h2>Evidence Boundaries</h2>
        <ul className="detail-list">
          {report.evidenceBoundaries.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="section-card">
        <h2>Risks</h2>
        <ul className="detail-list">
          {report.risks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="section-card">
        <h2>Update Log</h2>
        <ul className="detail-list">
          {report.updateLog.map((item) => (
            <li key={`${item.at}-${item.note}`}>
              {item.note}
              <div className="inline-ref">{item.at}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};
