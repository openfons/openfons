import { createCollectionLog, createSourceCapture } from '@openfons/domain-models';
import type { CrawlerExecutionRunner } from './types.js';

type HackerNewsItem = {
  id?: number;
  by?: string;
  score?: number;
  title?: string;
  text?: string;
  type?: string;
  url?: string;
};

const resolveItemId = (url: string) => {
  const parsed = new URL(url);
  const queryId = parsed.searchParams.get('id');

  if (queryId) {
    return queryId;
  }

  const pathMatch = parsed.pathname.match(/\/item\/(\d+)\.json$/);
  return pathMatch?.[1];
};

const buildApiUrl = ({
  baseUrl,
  itemId
}: {
  baseUrl: string;
  itemId: string;
}) => `${baseUrl.replace(/\/$/, '')}/item/${itemId}.json`;

const buildSummary = ({
  item,
  fallbackSummary
}: {
  item: HackerNewsItem;
  fallbackSummary: string;
}) => {
  const parts = [
    item.title?.trim(),
    item.by ? `by ${item.by}` : undefined,
    typeof item.score === 'number' ? `score ${item.score}` : undefined,
    item.text?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    item.url?.trim()
  ].filter((value): value is string => Boolean(value && value.length > 0));

  if (parts.length > 0) {
    return parts.join(' | ').slice(0, 220);
  }

  return fallbackSummary;
};

export const createHackerNewsApiRunner = ({
  fetchImpl = fetch
}: {
  fetchImpl?: typeof fetch;
} = {}): CrawlerExecutionRunner => async (plan) => {
  const itemId = resolveItemId(plan.capturePlan.url);

  if (!itemId) {
    throw new Error(
      `hacker-news-api execution failed for ${plan.capturePlan.url}: could not resolve item id`
    );
  }

  const baseUrl = plan.runtime.collection.config.baseUrl;

  if (typeof baseUrl !== 'string' || baseUrl.trim().length === 0) {
    throw new Error(
      `hacker-news-api execution failed for ${plan.capturePlan.url}: baseUrl is required`
    );
  }

  const response = await fetchImpl(buildApiUrl({ baseUrl, itemId }));

  if (!response.ok) {
    throw new Error(
      `hacker-news-api execution failed for ${plan.capturePlan.url}: ${response.status}`
    );
  }

  const payload = (await response.json()) as unknown;

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(
      `invalid hacker-news-api payload for ${plan.capturePlan.url}: expected object`
    );
  }

  const item = payload as HackerNewsItem;
  const sourceCapture = createSourceCapture({
    topicRunId: plan.capturePlan.topicRunId,
    title: plan.capturePlan.title,
    url: plan.capturePlan.url,
    sourceKind: plan.capturePlan.sourceKind,
    useAs: plan.capturePlan.useAs,
    reportability: plan.capturePlan.reportability,
    riskLevel: plan.capturePlan.riskLevel,
    captureType: plan.capturePlan.captureType,
    language: plan.capturePlan.language,
    region: plan.capturePlan.region,
    summary: buildSummary({
      item,
      fallbackSummary: plan.capturePlan.snippet || plan.capturePlan.title
    })
  });

  return {
    sourceCapture,
    collectionLogs: [
      createCollectionLog({
        topicRunId: plan.capturePlan.topicRunId,
        captureId: sourceCapture.id,
        step: 'capture',
        status: 'success',
        message: `Captured ${sourceCapture.title} via hacker-news-api (${itemId})`
      })
    ]
  };
};
