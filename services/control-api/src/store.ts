import type {
  CompilationResult,
  OpportunitySpec,
  ReportView
} from '@openfons/contracts';

export type MemoryStore = {
  getOpportunity: (id: string) => OpportunitySpec | undefined;
  saveOpportunity: (opportunity: OpportunitySpec) => void;
  saveCompilation: (result: CompilationResult) => void;
  getReportView: (id: string) => ReportView | undefined;
};

export const createMemoryStore = (): MemoryStore => {
  const opportunities = new Map<string, OpportunitySpec>();
  const reportViews = new Map<string, ReportView>();

  return {
    getOpportunity: (id) => opportunities.get(id),
    saveOpportunity: (opportunity) => {
      opportunities.set(opportunity.id, opportunity);
    },
    saveCompilation: (result) => {
      opportunities.set(result.opportunity.id, result.opportunity);
      reportViews.set(result.report.id, {
        report: result.report,
        evidenceSet: result.evidenceSet,
        sourceCaptures: result.sourceCaptures,
        collectionLogs: result.collectionLogs
      });
    },
    getReportView: (id) => reportViews.get(id)
  };
};
