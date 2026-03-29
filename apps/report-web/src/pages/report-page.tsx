import { useEffect, useState } from 'react';
import type { ReportSpec } from '@openfons/contracts';
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
  const [report, setReport] = useState<ReportSpec | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadReport(reportId)
      .then((next) => {
        if (!cancelled) {
          setReport(next);
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

  if (!report) {
    return <p className="page-shell">Loading report...</p>;
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">OpenFons Report Delivery</p>
        <h1>{report.title}</h1>
        <p className="meta-line">
          {report.audience} / {report.geo} / {report.language}
        </p>
        <p>{report.summary}</p>
        <p className="thesis">{report.thesis}</p>
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
            <li key={`${item.at}-${item.note}`}>{item.note}</li>
          ))}
        </ul>
      </section>
    </main>
  );
};
