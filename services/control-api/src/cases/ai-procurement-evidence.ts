import type { EvidenceSet, SourceCapture } from '@openfons/contracts';

export const validateAiProcurementEvidence = (input: {
  sourceCaptures: SourceCapture[];
  evidenceSet: EvidenceSet;
}) => {
  const officialCaptureCount = input.sourceCaptures.filter(
    (capture) => capture.sourceKind === 'official'
  ).length;
  const communityCaptureCount = input.sourceCaptures.filter(
    (capture) => capture.sourceKind === 'community'
  ).length;

  if (officialCaptureCount === 0) {
    return {
      valid: false as const,
      code: 'insufficient_public_evidence' as const,
      message: 'Need at least one official source family before compile.'
    };
  }

  if (communityCaptureCount === 0) {
    return {
      valid: false as const,
      code: 'insufficient_public_evidence' as const,
      message: 'Need at least one corroborating community source before compile.'
    };
  }

  if (input.evidenceSet.items.length === 0) {
    return {
      valid: false as const,
      code: 'insufficient_public_evidence' as const,
      message: 'Need at least one evidence item before compile.'
    };
  }

  return { valid: true as const };
};
