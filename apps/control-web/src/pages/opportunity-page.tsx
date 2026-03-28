import type { FormEvent } from 'react';
import { useState } from 'react';
import type { CompilationResult, OpportunityInput } from '@openfons/contracts';
import { createControlApi, type ControlApi } from '../api';

type OpportunityPageProps = {
  api?: ControlApi;
  reportBaseUrl?: string;
};

const initialForm: OpportunityInput = {
  title: '',
  query: '',
  market: '',
  audience: '',
  problem: '',
  outcome: ''
};

export function OpportunityPage({
  api = createControlApi(
    import.meta.env.VITE_CONTROL_API_BASE_URL ?? 'http://localhost:3001'
  ),
  reportBaseUrl = import.meta.env.VITE_REPORT_WEB_BASE_URL ?? 'http://localhost:3002'
}: OpportunityPageProps) {
  const [form, setForm] = useState<OpportunityInput>(initialForm);
  const [result, setResult] = useState<CompilationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = <K extends keyof OpportunityInput>(
    field: K,
    value: OpportunityInput[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const opportunity = await api.createOpportunity(form);
      const compilation = await api.compileOpportunity(opportunity.id);
      setResult(compilation);
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError('Failed to compile opportunity');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page">
      <section className="panel">
        <p className="eyebrow">OpenFons Control Plane</p>
        <h1>Compile the first report shell</h1>
        <p className="lede">
          Capture the opportunity context and trigger compilation for a minimal report.
        </p>
        <form onSubmit={submit} className="form">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            required
          />

          <label htmlFor="query">Query</label>
          <input
            id="query"
            name="query"
            value={form.query}
            onChange={(event) => updateField('query', event.target.value)}
            required
          />

          <label htmlFor="market">Market</label>
          <input
            id="market"
            name="market"
            value={form.market}
            onChange={(event) => updateField('market', event.target.value)}
            required
          />

          <label htmlFor="audience">Audience</label>
          <input
            id="audience"
            name="audience"
            value={form.audience}
            onChange={(event) => updateField('audience', event.target.value)}
            required
          />

          <label htmlFor="problem">Problem</label>
          <textarea
            id="problem"
            name="problem"
            value={form.problem}
            onChange={(event) => updateField('problem', event.target.value)}
            required
          />

          <label htmlFor="outcome">Outcome</label>
          <textarea
            id="outcome"
            name="outcome"
            value={form.outcome}
            onChange={(event) => updateField('outcome', event.target.value)}
            required
          />

          <button type="submit" disabled={submitting}>
            {submitting ? 'Compiling...' : 'Compile report shell'}
          </button>
        </form>
        {error ? <p role="alert">{error}</p> : null}
      </section>

      {result ? (
        <section className="panel">
          <h2>Compilation ready</h2>
          <p>{result.report.summary}</p>
          <p>{result.workflow.taskIds.length} workflow tasks prepared.</p>
          <a href={`${reportBaseUrl}/reports/${result.report.id}`}>Open report shell</a>
        </section>
      ) : null}
    </main>
  );
}
