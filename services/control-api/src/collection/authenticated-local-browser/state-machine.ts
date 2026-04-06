export type AuthenticatedLocalBrowserState =
  | 'planned'
  | 'awaiting-operator'
  | 'launching'
  | 'connected'
  | 'navigating'
  | 'capturing'
  | 'captured'
  | 'blocked'
  | 'failed';

export type AuthenticatedLocalBrowserEvent =
  | 'queue'
  | 'operator-approved'
  | 'browser-launched'
  | 'navigation-started'
  | 'page-loaded'
  | 'capture-succeeded'
  | 'policy-blocked'
  | 'capture-failed';

const TRANSITIONS: Record<
  AuthenticatedLocalBrowserState,
  Partial<Record<AuthenticatedLocalBrowserEvent, AuthenticatedLocalBrowserState>>
> = {
  planned: {
    queue: 'awaiting-operator',
    'policy-blocked': 'blocked'
  },
  'awaiting-operator': {
    'operator-approved': 'launching',
    'policy-blocked': 'blocked'
  },
  launching: {
    'browser-launched': 'connected',
    'capture-failed': 'failed'
  },
  connected: {
    'navigation-started': 'navigating',
    'capture-failed': 'failed'
  },
  navigating: {
    'page-loaded': 'capturing',
    'capture-failed': 'failed'
  },
  capturing: {
    'capture-succeeded': 'captured',
    'capture-failed': 'failed'
  },
  captured: {},
  blocked: {},
  failed: {}
};

export const nextAuthenticatedLocalBrowserState = (
  current: AuthenticatedLocalBrowserState,
  event: AuthenticatedLocalBrowserEvent
): AuthenticatedLocalBrowserState => {
  const next = TRANSITIONS[current][event];

  if (!next) {
    throw new Error(`invalid local-browser transition: ${current} -> ${event}`);
  }

  return next;
};
