import type {
  CollectionLog,
  Evidence,
  EvidenceSet,
  OpportunitySpec,
  SourceCapture,
  WorkflowSpec
} from '@openfons/contracts';
import {
  createCollectionLog,
  createEvidenceSet,
  createSourceCapture,
  createTopicRun
} from '@openfons/domain-models';
import { createId, nowIso } from '@openfons/shared';
import {
  classifyAiProcurementOpportunity
} from './ai-procurement-intake.js';
import {
  AI_PROCUREMENT_VENDOR_CHOICE_PROFILE,
  resolveAiProcurementProfile,
  type AiProcurementCaptureTarget,
  type AiProcurementProfile
} from './ai-procurement-profiles.js';

export const AI_PROCUREMENT_CASE_KEY = 'ai-procurement-v1';

export type AiProcurementCaseBundle = {
  topicRun: {
    id: string;
    opportunityId: string;
    workflowId: string;
    topicKey: string;
    status: 'compiled';
    startedAt: string;
    updatedAt: string;
  };
  sourceCaptures: SourceCapture[];
  collectionLogs: CollectionLog[];
  evidenceSet: EvidenceSet;
};

export const AI_PROCUREMENT_CAPTURE_TARGETS: AiProcurementCaptureTarget[] =
  AI_PROCUREMENT_VENDOR_CHOICE_PROFILE.captureTargets;

export const supportsAiProcurementCase = (
  opportunity: OpportunitySpec
) => classifyAiProcurementOpportunity(opportunity).supported;

export const resolveAiProcurementProfileForOpportunity = (
  opportunity: OpportunitySpec
): AiProcurementProfile => {
  const policy = classifyAiProcurementOpportunity(opportunity);

  if (!policy.supported) {
    throw new Error(`unsupported ai procurement opportunity: ${policy.reason}`);
  }

  return resolveAiProcurementProfile(opportunity, policy.family);
};

const buildEvidenceItems = (
  topicRunId: string,
  profile: AiProcurementProfile,
  sourceCaptures: AiProcurementCaseBundle['sourceCaptures']
): Evidence[] => {
  const capturesByKey = new Map(
    profile.captureTargets.map((target, index) => [target.key, sourceCaptures[index]])
  );

  return profile.evidenceTemplates.map((template) => {
    const primaryCapture = capturesByKey.get(template.captureKey);

    if (!primaryCapture) {
      throw new Error(`missing source capture for target ${template.captureKey}`);
    }

    return {
      id: createId('evi'),
      topicRunId,
      captureId: primaryCapture.id,
      kind: template.kind,
      statement: template.statement,
      sourceKind: template.sourceKind,
      useAs: template.useAs,
      reportability: template.reportability,
      riskLevel: template.riskLevel,
      freshnessNote: template.freshnessNote,
      supportingCaptureIds: template.supportingCaptureKeys.map((captureKey) => {
        const capture = capturesByKey.get(captureKey);

        if (!capture) {
          throw new Error(`missing supporting source capture for target ${captureKey}`);
        }

        return capture.id;
      })
    };
  });
};

export const buildAiProcurementCase = (
  opportunity: OpportunitySpec,
  workflow: WorkflowSpec
): AiProcurementCaseBundle => {
  const topicRun = createTopicRun(opportunity.id, workflow.id, 'ai-procurement');
  const profile = resolveAiProcurementProfileForOpportunity(opportunity);

  const sourceCaptures: SourceCapture[] = profile.captureTargets.map(
    (target) =>
      createSourceCapture({
        topicRunId: topicRun.id,
        title: target.title,
        url: target.url,
        sourceKind: target.sourceKind,
        useAs: target.useAs,
        reportability: target.reportability,
        riskLevel: target.riskLevel,
        captureType: target.captureType,
        language: target.language,
        region: target.region,
        summary: target.summary
      })
  );

  const collectionLogs = sourceCaptures.map((capture) =>
    createCollectionLog({
      topicRunId: topicRun.id,
      captureId: capture.id,
      step: 'capture',
      status: 'success',
      message: `Captured ${capture.title}`
    })
  );

  const evidenceSet = createEvidenceSet(topicRun.id);

  return {
    topicRun: {
      ...topicRun,
      status: 'compiled',
      updatedAt: nowIso()
    },
    sourceCaptures,
    collectionLogs,
    evidenceSet: {
      ...evidenceSet,
      updatedAt: nowIso(),
      items: buildEvidenceItems(topicRun.id, profile, sourceCaptures)
    }
  };
};

export const addAiProcurementFallbackWarning = (
  bundle: AiProcurementCaseBundle,
  reason: string,
  logs: CollectionLog[] = []
): AiProcurementCaseBundle => {
  const fallbackCaptureIds = new Set(bundle.sourceCaptures.map((capture) => capture.id));
  const normalizedRuntimeLogs = logs.map((log) => ({
    ...log,
    topicRunId: bundle.topicRun.id,
    captureId:
      log.captureId && fallbackCaptureIds.has(log.captureId)
        ? log.captureId
        : undefined
  }));

  return {
    ...bundle,
    collectionLogs: [
      ...normalizedRuntimeLogs,
      createCollectionLog({
        topicRunId: bundle.topicRun.id,
        step: 'discover',
        status: 'warning',
        message: `Real collection bridge used deterministic fallback: ${reason}`
      }),
      ...bundle.collectionLogs
    ]
  };
};
