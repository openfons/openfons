import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createMemoryStore } from './store.js';
import {
  createRuntimeGateway,
  loadProviderStatus,
  loadValidation
} from './config.js';

const store = createMemoryStore();
const repoRoot = process.cwd();
const secretRoot = process.env.OPENFONS_SECRET_ROOT;
const getGateway = (projectId: string) =>
  createRuntimeGateway({
    projectId,
    repoRoot,
    secretRoot,
    fetchImpl: fetch,
    runStore: store
  });

const app = createApp({
  search: (request) => getGateway(request.projectId).search(request),
  providerStatus: (projectId = 'openfons') =>
    loadProviderStatus(projectId, repoRoot, secretRoot),
  validate: (projectId = 'openfons') =>
    loadValidation(projectId, repoRoot, secretRoot),
  upgrade: (searchRunId, selection) =>
    getGateway(store.getRun(searchRunId)?.searchRun.projectId ?? 'openfons').upgradeCandidates(
      searchRunId,
      selection
    )
}, store);

serve(
  {
    fetch: app.fetch,
    port: 3003
  },
  () => {
    console.log('search-gateway listening on http://localhost:3003');
  }
);
