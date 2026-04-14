import { useState, type FormEvent } from 'react';
import type {
  CompilationResult,
  OpportunityQuestion,
  OpportunitySpec
} from '@openfons/contracts';
import {
  ControlApiError,
  createControlApi,
  type ControlApi
} from '../api';

type Props = {
  api?: ControlApi;
  reportBaseUrl?: string;
};

const initialQuestionForm: OpportunityQuestion = {
  question: '',
  marketHint: '',
  audienceHint: '',
  geoHint: '',
  languageHint: ''
};

export const OpportunityPage = ({
  api = createControlApi(import.meta.env.VITE_CONTROL_API_BASE_URL ?? 'http://localhost:3001'),
  reportBaseUrl = import.meta.env.VITE_REPORT_WEB_BASE_URL ?? 'http://localhost:3002'
}: Props) => {
  const [form, setForm] = useState<OpportunityQuestion>(initialQuestionForm);
  const [opportunity, setOpportunity] = useState<OpportunitySpec | null>(null);
  const [result, setResult] = useState<CompilationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateField = (key: keyof OpportunityQuestion, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    setOpportunity(null);

    try {
      const planned = await api.planOpportunity(form);
      setOpportunity(planned);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught : new Error('Unknown error')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmAndCompile = async () => {
    if (!opportunity?.planning) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const confirmed =
        opportunity.planning.approval.status === 'pending_user_confirmation'
          ? await api.confirmOpportunity(opportunity.id, {
              selectedOptionId: opportunity.planning.recommendedOptionId
            })
          : opportunity;
      setOpportunity(confirmed);

      const compiled = await api.compileOpportunity(confirmed.id);
      setResult(compiled);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught : new Error('Unknown error')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const scopeGuidance =
    error instanceof ControlApiError && error.code === 'out_of_scope_domain'
      ? 'Try a vendor choice, pricing, or capability access question inside AI procurement.'
      : null;

  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">OpenFons Control Plane</p>
        <h1>Plan the first report shell</h1>
        <p className="lede">
          Submit one bounded AI procurement question, review the recommended page angle, then compile a source-backed report.
        </p>
        <ul className="summary-list">
          <li>Vendor choice</li>
          <li>Pricing and access</li>
          <li>Capability procurement</li>
        </ul>
        <form className="stack" onSubmit={submit}>
          <label>
            Question
            <textarea
              value={form.question}
              onChange={(event) => updateField('question', event.target.value)}
            />
          </label>
          <label>
            Audience
            <input
              value={form.audienceHint ?? ''}
              onChange={(event) => updateField('audienceHint', event.target.value)}
            />
          </label>
          <label>
            Geo
            <input
              value={form.geoHint ?? ''}
              onChange={(event) => updateField('geoHint', event.target.value)}
            />
          </label>
          <label>
            Language
            <input
              value={form.languageHint ?? ''}
              onChange={(event) => updateField('languageHint', event.target.value)}
            />
          </label>
          <label>
            Market
            <input
              value={form.marketHint ?? ''}
              onChange={(event) => updateField('marketHint', event.target.value)}
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Planning...' : 'Plan opportunity'}
          </button>
        </form>
        {error ? <p className="error">{error.message}</p> : null}
        {scopeGuidance ? <p className="error">{scopeGuidance}</p> : null}
      </section>
      {opportunity?.planning ? (
        <section className="panel result-card">
          <h2>{opportunity.title}</h2>
          <p>{opportunity.angle}</p>
          <ul className="summary-list">
            <li>Search intent: {opportunity.searchIntent}</li>
            <li>
              Recommendation:{' '}
              {opportunity.planning.options.find(
                (item) => item.id === opportunity.planning?.recommendedOptionId
              )?.primaryKeyword ?? 'Pending'}
            </li>
            <li>Approval: {opportunity.planning.approval.status}</li>
          </ul>
          {!result ? (
            <button type="button" disabled={submitting} onClick={confirmAndCompile}>
              {submitting
                ? 'Compiling...'
                : opportunity.planning.approval.status ===
                    'pending_user_confirmation'
                  ? 'Confirm and compile'
                  : 'Compile confirmed opportunity'}
            </button>
          ) : null}
        </section>
      ) : null}

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
