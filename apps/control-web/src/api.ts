import type { CompilationResult, OpportunityInput, OpportunitySpec } from '@openfons/contracts';

export type ControlApi = {
  createOpportunity: (input: OpportunityInput) => Promise<OpportunitySpec>;
  compileOpportunity: (opportunityId: string) => Promise<CompilationResult>;
};

const readErrorMessage = async (
  response: Response,
  fallback: string
) => {
  const message = (await response.text()).trim();
  return message || fallback;
};

export const createControlApi = (baseUrl: string): ControlApi => ({
  async createOpportunity(input) {
    const response = await fetch(`${baseUrl}/api/v1/opportunities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, 'Failed to create opportunity')
      );
    }

    const parsed = (await response.json()) as { opportunity: OpportunitySpec };
    return parsed.opportunity;
  },
  async compileOpportunity(opportunityId) {
    const response = await fetch(
      `${baseUrl}/api/v1/opportunities/${opportunityId}/compile`,
      {
        method: 'POST'
      }
    );

    if (!response.ok) {
      throw new Error(
        await readErrorMessage(response, 'Failed to compile opportunity')
      );
    }

    return (await response.json()) as CompilationResult;
  }
});
