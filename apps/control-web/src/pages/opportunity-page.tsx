import { useState, type FormEvent } from 'react';
import type { CompilationResult, OpportunityInput } from '@openfons/contracts';
import { createControlApi, type ControlApi } from '../api';

type Props = {
  api?: ControlApi;
  reportBaseUrl?: string;
};

const initialForm: OpportunityInput = {
  title: '',
  query: '',
  market: '',
  audience: '',
  problem: '',
  outcome: '',
  geo: '',
  language: ''
};

export const OpportunityPage = ({
  api = createControlApi(import.meta.env.VITE_CONTROL_API_BASE_URL ?? 'http://localhost:3001'),
  reportBaseUrl = import.meta.env.VITE_REPORT_WEB_BASE_URL ?? 'http://localhost:3002'
}: Props) => {
  const [form, setForm] = useState<OpportunityInput>(initialForm);
  const [result, setResult] = useState<CompilationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (key: keyof OpportunityInput, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const opportunity = await api.createOpportunity(form);
      const compiled = await api.compileOpportunity(opportunity.id);
      setResult(compiled);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">OpenFons Control Plane</p>
        <h1>Compile the first report shell</h1>
        <p className="lede">
          Submit one opportunity and prove the minimum control-plane slice.
        </p>
        <form className="stack" onSubmit={submit}>
          <label>
            Title
            <input value={form.title} onChange={(event) => updateField('title', event.target.value)} />
          </label>
          <label>
            Query
            <input value={form.query} onChange={(event) => updateField('query', event.target.value)} />
          </label>
          <label>
            Market
            <input value={form.market} onChange={(event) => updateField('market', event.target.value)} />
          </label>
          <label>
            Audience
            <input value={form.audience} onChange={(event) => updateField('audience', event.target.value)} />
          </label>
          <label>
            Geo
            <input value={form.geo} onChange={(event) => updateField('geo', event.target.value)} />
          </label>
          <label>
            Language
            <input value={form.language} onChange={(event) => updateField('language', event.target.value)} />
          </label>
          <label>
            Problem
            <textarea value={form.problem} onChange={(event) => updateField('problem', event.target.value)} />
          </label>
          <label>
            Outcome
            <textarea value={form.outcome} onChange={(event) => updateField('outcome', event.target.value)} />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Compiling...' : 'Compile report shell'}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>

      {result ? (
        <section className="panel result-card">
          <h2>Compilation ready</h2>
          <p>{result.report.summary}</p>
          <ul className="summary-list">
            <li>Search intent: {result.opportunity.searchIntent}</li>
            <li>Angle: {result.opportunity.angle}</li>
            <li>Primary page: {result.report.slug}</li>
            <li>Product hints: {result.opportunity.productOpportunityHints.length}</li>
          </ul>
          <a href={`${reportBaseUrl}/reports/${result.report.id}`}>Open report shell</a>
        </section>
      ) : null}
    </main>
  );
};
