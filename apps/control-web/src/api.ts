import {
  ApiErrorSchema,
  type CompilationPolicyCode,
  type CompilationResult,
  type OpportunityInput,
  type OpportunitySpec
} from '@openfons/contracts';

export type ControlApi = {
  createOpportunity: (input: OpportunityInput) => Promise<OpportunitySpec>;
  compileOpportunity: (opportunityId: string) => Promise<CompilationResult>;
};

export class ControlApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: CompilationPolicyCode
  ) {
    super(message);
    this.name = 'ControlApiError';
  }
}

const readApiError = async (
  response: Response,
  fallback: string
) => {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const parsed = ApiErrorSchema.safeParse(await response.json());

    if (parsed.success) {
      return new ControlApiError(
        parsed.data.message,
        response.status,
        parsed.data.code
      );
    }
  }

  const message = (await response.text()).trim();
  return new ControlApiError(message || fallback, response.status);
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
      throw await readApiError(response, 'Failed to create opportunity');
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
      throw await readApiError(response, 'Failed to compile opportunity');
    }

    return (await response.json()) as CompilationResult;
  }
});
