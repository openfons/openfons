import {
  ApiErrorSchema,
  type CompilationPolicyCode,
  type CompilationResult,
  type ConfirmOpportunityRequest,
  type OpportunityInput,
  type OpportunityQuestion,
  type OpportunitySpec
} from '@openfons/contracts';

export type ControlApi = {
  planOpportunity: (question: OpportunityQuestion) => Promise<OpportunitySpec>;
  confirmOpportunity: (
    opportunityId: string,
    request: ConfirmOpportunityRequest
  ) => Promise<OpportunitySpec>;
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

export const createControlApi = (baseUrl: string): ControlApi => {
  const postJson = async (url: string, body: unknown, fallback: string) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw await readApiError(response, fallback);
    }

    const parsed = (await response.json()) as { opportunity: OpportunitySpec };
    return parsed.opportunity;
  };

  return {
    planOpportunity(question) {
      return postJson(
        `${baseUrl}/api/v1/opportunities/plan`,
        question,
        'Failed to plan opportunity'
      );
    },
    confirmOpportunity(opportunityId, request) {
      return postJson(
        `${baseUrl}/api/v1/opportunities/${opportunityId}/confirm`,
        request,
        'Failed to confirm opportunity'
      );
    },
    createOpportunity(input) {
      return postJson(
        `${baseUrl}/api/v1/opportunities`,
        input,
        'Failed to create opportunity'
      );
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
  };
};
