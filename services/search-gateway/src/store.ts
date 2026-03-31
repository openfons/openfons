import type {
  SearchRunResult,
  UpgradeDispatchResult
} from '@openfons/contracts';

export const createMemoryStore = () => {
  const runs = new Map<string, SearchRunResult>();
  const dispatches = new Map<string, UpgradeDispatchResult>();

  return {
    saveRun(run: SearchRunResult) {
      runs.set(run.searchRun.id, run);
    },
    getRun(id: string) {
      return runs.get(id);
    },
    saveDispatch(result: UpgradeDispatchResult) {
      dispatches.set(result.searchRunId, result);
    },
    getDispatch(searchRunId: string) {
      return dispatches.get(searchRunId);
    }
  };
};

export type MemoryStore = ReturnType<typeof createMemoryStore>;
