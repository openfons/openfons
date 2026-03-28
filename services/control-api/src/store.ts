import type {
  CompilationResult,
  OpportunitySpec,
  ReportSpec
} from '@openfons/contracts';

export type MemoryStore = {
  getOpportunity: (id: string) => OpportunitySpec | undefined;
  saveOpportunity: (opportunity: OpportunitySpec) => void;
  saveCompilation: (result: CompilationResult) => void;
  getReport: (id: string) => ReportSpec | undefined;
};

export const createMemoryStore = (): MemoryStore => {
  const opportunities = new Map<string, OpportunitySpec>();
  const reports = new Map<string, ReportSpec>();

  return {
    getOpportunity: (id) => opportunities.get(id),
    saveOpportunity: (opportunity) => {
      opportunities.set(opportunity.id, opportunity);
    },
    saveCompilation: (result) => {
      opportunities.set(result.opportunity.id, result.opportunity);
      reports.set(result.report.id, result.report);
    },
    getReport: (id) => reports.get(id)
  };
};
