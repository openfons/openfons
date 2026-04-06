export type SiteAuthenticationMode = 'none' | 'optional' | 'required';

export type SiteInteractionMode =
  | 'document'
  | 'feed'
  | 'app-shell'
  | 'upload-flow';

export type SiteProfileCollectionMode =
  | 'http-first'
  | 'browser-first'
  | 'authenticated-local-browser';

export type SiteProfile = {
  id: string;
  label: string;
  hostnames: string[];
  authentication: SiteAuthenticationMode;
  interaction: SiteInteractionMode;
  defaultCollectionMode: SiteProfileCollectionMode;
  notes: string[];
};

const hasHostnameMatch = (hostname: string, candidate: string) =>
  hostname === candidate || hostname.endsWith(`.${candidate}`);

export const DEFAULT_SITE_PROFILES: SiteProfile[] = [
  {
    id: 'x',
    label: 'X / Twitter',
    hostnames: ['x.com', 'twitter.com'],
    authentication: 'optional',
    interaction: 'feed',
    defaultCollectionMode: 'browser-first',
    notes: [
      'Timeline and reply visibility can differ between logged-out and logged-in states.',
      'Keep authenticated local-browser as an explicit escalation when public capture is not enough.'
    ]
  },
  {
    id: 'reddit',
    label: 'Reddit',
    hostnames: ['reddit.com'],
    authentication: 'optional',
    interaction: 'feed',
    defaultCollectionMode: 'browser-first',
    notes: [
      'Many threads are public, but comment expansion and anti-bot behavior can require a browser.',
      'Keep public HTTP capture as the default unless the useful state is missing.'
    ]
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    hostnames: ['tiktok.com'],
    authentication: 'optional',
    interaction: 'app-shell',
    defaultCollectionMode: 'browser-first',
    notes: [
      'Public pages often degrade into app-shell or anti-bot flows.',
      'Escalate to authenticated local-browser only when the useful evidence truly depends on comments or account state.'
    ]
  },
  {
    id: 'douyin',
    label: 'Douyin',
    hostnames: ['douyin.com'],
    authentication: 'required',
    interaction: 'app-shell',
    defaultCollectionMode: 'authenticated-local-browser',
    notes: [
      'Useful capture frequently depends on a logged-in browser session.',
      'Do not promote Douyin into the default public-capture path.'
    ]
  },
  {
    id: 'xiaohongshu',
    label: 'Xiaohongshu',
    hostnames: ['xiaohongshu.com', 'xhslink.com'],
    authentication: 'required',
    interaction: 'app-shell',
    defaultCollectionMode: 'authenticated-local-browser',
    notes: [
      'Logged-out capture is unstable and often incomplete.',
      'Record the final resolved note URL together with the screenshot set.'
    ]
  },
  {
    id: 'wechat-article',
    label: 'WeChat Article',
    hostnames: ['mp.weixin.qq.com'],
    authentication: 'none',
    interaction: 'document',
    defaultCollectionMode: 'http-first',
    notes: [
      'Public article URLs are usually capturable without login.',
      'Authenticated local-browser should stay opt-in for article-only evidence.'
    ]
  }
];

export const resolveSiteProfile = (
  url: string,
  profiles: SiteProfile[] = DEFAULT_SITE_PROFILES
): SiteProfile | undefined => {
  const hostname = new URL(url).hostname.toLowerCase();

  return profiles.find((profile) =>
    profile.hostnames.some((candidate) =>
      hasHostnameMatch(hostname, candidate.toLowerCase())
    )
  );
};
