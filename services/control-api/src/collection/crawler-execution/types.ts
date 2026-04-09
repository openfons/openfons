import type { ResolvedCrawlerRouteRuntime } from '@openfons/config-center';
import type { CollectionLog, SourceCapture } from '@openfons/contracts';
import type { CapturePlan } from '../capture-runner.js';

export type CrawlerExecutionPlan = {
  capturePlan: CapturePlan;
  runtime: ResolvedCrawlerRouteRuntime;
};

export type CrawlerExecutionResult = {
  sourceCapture: SourceCapture;
  collectionLogs: CollectionLog[];
};

export type CrawlerExecutionRunner = (
  plan: CrawlerExecutionPlan
) => Promise<CrawlerExecutionResult>;
