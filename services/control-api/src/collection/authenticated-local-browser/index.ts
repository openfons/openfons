import type {
  CompilationPolicyCode,
  MaskedResolvedPluginRuntime
} from '@openfons/contracts';
import type { CapturePlan } from '../capture-runner.js';
import {
  DEFAULT_SITE_PROFILES,
  resolveSiteProfile,
  type SiteProfile
} from './site-profiles.js';
import {
  nextAuthenticatedLocalBrowserState,
  type AuthenticatedLocalBrowserEvent,
  type AuthenticatedLocalBrowserState
} from './state-machine.js';

export type LocalBrowserArtifactKind =
  | 'page-html'
  | 'page-dom'
  | 'screenshot'
  | 'interaction-log'
  | 'session-note';

export type AuthenticatedLocalBrowserReason = Extract<
  CompilationPolicyCode,
  'needs_authenticated_capture'
>;

export type AuthenticatedLocalBrowserCaptureRequest = {
  state: AuthenticatedLocalBrowserState;
  reason: AuthenticatedLocalBrowserReason;
  title: string;
  url: string;
  siteProfile: SiteProfile;
  browserRuntime?: MaskedResolvedPluginRuntime;
  requiresAuthenticatedSession: boolean;
  requiresOperatorApproval: boolean;
  requiredArtifacts: LocalBrowserArtifactKind[];
  recommendedSteps: string[];
};

export type AuthenticatedLocalBrowserDecision =
  | {
      action: 'skip';
      reason:
        | 'unsupported-site'
        | 'public-path-sufficient'
        | 'requires-public-browser';
    }
  | {
      action: 'request';
      request: AuthenticatedLocalBrowserCaptureRequest;
    };

export const AUTHENTICATED_LOCAL_BROWSER_MINIMAL_FILE_STRUCTURE = [
  'services/control-api/src/collection/authenticated-local-browser/index.ts',
  'services/control-api/src/collection/authenticated-local-browser/site-profiles.ts',
  'services/control-api/src/collection/authenticated-local-browser/state-machine.ts',
  'services/local-browser-bridge/',
  'config/site-profiles/',
  'tests/integration/authenticated-local-browser.test.ts'
] as const;

const buildRecommendedSteps = (
  profile: SiteProfile,
  requiresAuthenticatedSession: boolean
) => {
  const steps = [
    'Verify the target URL and resolve the canonical page before capture.',
    'Connect to an operator-owned local browser bridge for the target session.',
    'Capture the final page HTML/DOM, a screenshot, and an interaction log.'
  ];

  if (requiresAuthenticatedSession) {
    steps.splice(
      1,
      0,
      'Confirm that the operator-approved browser session is logged in to the target site.'
    );
  }

  if (profile.interaction !== 'document') {
    steps.push(
      'Record any clicks, scrolls, expansions, or uploads needed to reveal the useful state.'
    );
  }

  return steps;
};

const buildRequiredArtifacts = (
  requiresAuthenticatedSession: boolean
): LocalBrowserArtifactKind[] => {
  const artifacts: LocalBrowserArtifactKind[] = [
    'page-html',
    'page-dom',
    'screenshot',
    'interaction-log'
  ];

  if (requiresAuthenticatedSession) {
    artifacts.push('session-note');
  }

  return artifacts;
};

export const planAuthenticatedLocalBrowserCapture = (
  plan: CapturePlan,
  options: {
    policyCode?: AuthenticatedLocalBrowserReason;
    siteProfiles?: SiteProfile[];
  } = {}
): AuthenticatedLocalBrowserDecision => {
  const siteProfile = resolveSiteProfile(plan.url, options.siteProfiles);

  if (!siteProfile) {
    return {
      action: 'skip',
      reason: 'unsupported-site'
    };
  }

  const policyReason = options.policyCode;
  const requiresAuthenticatedSession =
    siteProfile.authentication === 'required' ||
    siteProfile.defaultCollectionMode === 'authenticated-local-browser' ||
    policyReason === 'needs_authenticated_capture';

  if (!requiresAuthenticatedSession) {
    if (siteProfile.defaultCollectionMode === 'browser-first') {
      return {
        action: 'skip',
        reason: 'requires-public-browser'
      };
    }

    return {
      action: 'skip',
      reason: 'public-path-sufficient'
    };
  }

  return {
    action: 'request',
    request: {
      state: 'planned',
      reason: policyReason ?? 'needs_authenticated_capture',
      title: plan.title,
      url: plan.url,
      siteProfile,
      requiresAuthenticatedSession,
      requiresOperatorApproval: true,
      requiredArtifacts: buildRequiredArtifacts(requiresAuthenticatedSession),
      recommendedSteps: buildRecommendedSteps(
        siteProfile,
        requiresAuthenticatedSession
      )
    }
  };
};

export {
  DEFAULT_SITE_PROFILES,
  nextAuthenticatedLocalBrowserState,
  resolveSiteProfile,
  type AuthenticatedLocalBrowserEvent,
  type AuthenticatedLocalBrowserState,
  type SiteProfile
};
