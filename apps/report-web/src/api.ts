import type { ReportSpec } from '@openfons/contracts';

export type ReportLoader = (reportId: string) => Promise<ReportSpec>;

export const createReportLoader = (baseUrl: string): ReportLoader => {
  return async (reportId) => {
    const response = await fetch(`${baseUrl}/api/v1/reports/${reportId}`);

    if (!response.ok) {
      throw new Error('Failed to load report');
    }

    return (await response.json()) as ReportSpec;
  };
};
