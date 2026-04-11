import type {
  CompilationResult,
  OpportunitySpec,
  ReportView
} from '@openfons/contracts';
import { buildReportView } from './artifacts/report-view.js';

export type MemoryStore = {
  getOpportunity: (id: string) => OpportunitySpec | undefined;
  saveOpportunity: (opportunity: OpportunitySpec) => void;
  saveCompilation: (result: CompilationResult) => void;
  getCompilationByReportId: (reportId: string) => CompilationResult | undefined;
  getReportView: (id: string) => ReportView | undefined;
};

export const createMemoryStore = (): MemoryStore => {
  const opportunities = new Map<string, OpportunitySpec>();
  const compilations = new Map<string, CompilationResult>();
  const reportViews = new Map<string, ReportView>();

  return {
    getOpportunity: (id) => opportunities.get(id),
    saveOpportunity: (opportunity) => {
      opportunities.set(opportunity.id, opportunity);
    },
    saveCompilation: (result) => {
      opportunities.set(result.opportunity.id, result.opportunity);
      compilations.set(result.report.id, result);
      reportViews.set(result.report.id, buildReportView(result));
    },
    getCompilationByReportId: (reportId) => compilations.get(reportId),
    getReportView: (id) => reportViews.get(id)
  };
};
