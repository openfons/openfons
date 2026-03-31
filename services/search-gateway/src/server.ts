import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { createMemoryStore } from './store.js';
import {
  createRuntimeGateway,
  loadProviderStatus,
  loadValidation
} from './config.js';

const store = createMemoryStore();
const getGateway = (projectId: string) =>
  createRuntimeGateway({
    projectId,
    env: process.env,
    fetchImpl: fetch,
    runStore: store
  });

const app = createApp({
  search: (request) => getGateway(request.projectId).search(request),
  providerStatus: (projectId?: string) => loadProviderStatus(projectId, process.env),
  validate: (projectId?: string) => loadValidation(projectId, process.env),
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
