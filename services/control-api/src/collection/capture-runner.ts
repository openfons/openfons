import type {
  CollectionLog,
  SourceCapture,
} from '@openfons/contracts';
import {
  createCollectionLog,
  createSourceCapture
} from '@openfons/domain-models';

export type CapturePlan = {
  topicRunId: string;
  title: string;
  url: string;
  snippet: string;
  sourceKind: SourceCapture['sourceKind'];
  useAs: SourceCapture['useAs'];
  reportability: SourceCapture['reportability'];
  riskLevel: SourceCapture['riskLevel'];
  captureType: SourceCapture['captureType'];
  language: string;
  region: string;
};

export type CaptureRunner = (
  plans: CapturePlan[]
) => Promise<{
  sourceCaptures: SourceCapture[];
  collectionLogs: CollectionLog[];
}>;

const stripMarkup = (input: string) =>
  input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const summarizePage = ({
  body,
  snippet,
  title
}: {
  body: string;
  snippet: string;
  title: string;
}) => {
  const stripped = stripMarkup(body);

  if (stripped.length > 0) {
    return stripped.slice(0, 220);
  }

  if (snippet.trim().length > 0) {
    return snippet.trim();
  }

  return title;
};

export const createCaptureRunner = ({
  fetchImpl = fetch
}: {
  fetchImpl?: typeof fetch;
} = {}): CaptureRunner => async (plans) => {
  const sourceCaptures: SourceCapture[] = [];
  const collectionLogs: CollectionLog[] = [];

  for (const plan of plans) {
    const response = await fetchImpl(plan.url);

    if (!response.ok) {
      throw new Error(`capture failed for ${plan.url}: ${response.status}`);
    }

    const body = await response.text();
    const capture = createSourceCapture({
      topicRunId: plan.topicRunId,
      title: plan.title,
      url: plan.url,
      sourceKind: plan.sourceKind,
      useAs: plan.useAs,
      reportability: plan.reportability,
      riskLevel: plan.riskLevel,
      captureType: plan.captureType,
      language: plan.language,
      region: plan.region,
      summary: summarizePage({
        body,
        snippet: plan.snippet,
        title: plan.title
      })
    });

    sourceCaptures.push(capture);
    collectionLogs.push(
      createCollectionLog({
        topicRunId: plan.topicRunId,
        captureId: capture.id,
        step: 'capture',
        status: 'success',
        message: `Captured ${capture.title} via real collection bridge`
      })
    );
  }

  return {
    sourceCaptures,
    collectionLogs
  };
};
