import type { PluginSpec, PluginType, PluginTypeId } from '@openfons/contracts';

export const BUILTIN_PLUGIN_TYPES: PluginType[] = [
  {
    id: 'search-provider',
    displayName: 'Search Provider',
    description: 'Discovery provider used by SearchGateway.',
    allowDrivers: ['google', 'ddg', 'bing', 'baidu', 'brave', 'tavily'],
    allowDependencies: ['proxy-source']
  },
  {
    id: 'browser-runtime',
    displayName: 'Browser Runtime',
    description: 'Browser runtime used for operator-assisted capture.',
    allowDrivers: ['local-playwright', 'pinchtab'],
    allowDependencies: ['proxy-source', 'cookie-source', 'account-source']
  },
  {
    id: 'crawler-adapter',
    displayName: 'Crawler Adapter',
    description: 'External collection adapter such as yt-dlp or twscrape.',
    allowDrivers: ['yt-dlp', 'twscrape', 'tiktok-api', 'praw', 'media-crawler'],
    allowDependencies: [
      'browser-runtime',
      'account-source',
      'cookie-source',
      'proxy-source'
    ]
  },
  {
    id: 'account-source',
    displayName: 'Account Source',
    description: 'Account pools or credential files used by crawler adapters.',
    allowDrivers: ['credentials-file'],
    allowDependencies: []
  },
  {
    id: 'cookie-source',
    displayName: 'Cookie Source',
    description: 'Cookie/session exports used by crawler adapters.',
    allowDrivers: ['netscape-cookie-file'],
    allowDependencies: []
  },
  {
    id: 'proxy-source',
    displayName: 'Proxy Source',
    description: 'Static or rotating proxy pools.',
    allowDrivers: ['static-proxy-file'],
    allowDependencies: []
  }
];

export const BUILTIN_PLUGIN_SPECS: PluginSpec[] = [
  {
    type: 'search-provider',
    driver: 'google',
    requiredConfigFields: [],
    optionalConfigFields: ['endpoint'],
    secretFields: ['apiKeyRef', 'cxRef'],
    allowedDependencyTypes: ['proxy-source'],
    healthCheckKinds: ['credential', 'http']
  },
  {
    type: 'search-provider',
    driver: 'ddg',
    requiredConfigFields: [],
    optionalConfigFields: ['endpoint'],
    secretFields: [],
    allowedDependencyTypes: ['proxy-source'],
    healthCheckKinds: ['none']
  },
  {
    type: 'browser-runtime',
    driver: 'pinchtab',
    requiredConfigFields: ['baseUrl', 'allowedDomains'],
    optionalConfigFields: ['profile'],
    secretFields: ['tokenRef'],
    allowedDependencyTypes: ['proxy-source', 'cookie-source', 'account-source'],
    healthCheckKinds: ['credential', 'http']
  },
  {
    type: 'browser-runtime',
    driver: 'local-playwright',
    requiredConfigFields: ['allowedDomains'],
    optionalConfigFields: ['headless'],
    secretFields: [],
    allowedDependencyTypes: [],
    healthCheckKinds: ['none']
  },
  {
    type: 'crawler-adapter',
    driver: 'yt-dlp',
    requiredConfigFields: [],
    optionalConfigFields: ['format'],
    secretFields: [],
    allowedDependencyTypes: ['proxy-source'],
    healthCheckKinds: ['none']
  },
  {
    type: 'crawler-adapter',
    driver: 'tiktok-api',
    requiredConfigFields: ['region'],
    optionalConfigFields: [],
    secretFields: [],
    allowedDependencyTypes: [
      'browser-runtime',
      'account-source',
      'cookie-source',
      'proxy-source'
    ],
    healthCheckKinds: ['none']
  },
  {
    type: 'crawler-adapter',
    driver: 'twscrape',
    requiredConfigFields: [],
    optionalConfigFields: [],
    secretFields: [],
    allowedDependencyTypes: ['account-source', 'cookie-source', 'proxy-source'],
    healthCheckKinds: ['none']
  },
  {
    type: 'crawler-adapter',
    driver: 'praw',
    requiredConfigFields: [],
    optionalConfigFields: [],
    secretFields: [],
    allowedDependencyTypes: ['account-source', 'proxy-source'],
    healthCheckKinds: ['none']
  },
  {
    type: 'crawler-adapter',
    driver: 'media-crawler',
    requiredConfigFields: [],
    optionalConfigFields: [],
    secretFields: [],
    allowedDependencyTypes: [
      'browser-runtime',
      'account-source',
      'cookie-source',
      'proxy-source'
    ],
    healthCheckKinds: ['none']
  },
  {
    type: 'account-source',
    driver: 'credentials-file',
    requiredConfigFields: [],
    optionalConfigFields: [],
    secretFields: ['accountRef'],
    allowedDependencyTypes: [],
    healthCheckKinds: ['credential']
  },
  {
    type: 'cookie-source',
    driver: 'netscape-cookie-file',
    requiredConfigFields: [],
    optionalConfigFields: [],
    secretFields: ['sessionRef'],
    allowedDependencyTypes: [],
    healthCheckKinds: ['credential']
  },
  {
    type: 'proxy-source',
    driver: 'static-proxy-file',
    requiredConfigFields: ['strategy'],
    optionalConfigFields: [],
    secretFields: ['poolRef'],
    allowedDependencyTypes: [],
    healthCheckKinds: ['credential']
  }
];

export const listPluginTypes = () => BUILTIN_PLUGIN_TYPES;

export const getPluginType = (typeId: PluginTypeId) =>
  BUILTIN_PLUGIN_TYPES.find((item) => item.id === typeId);

export const getPluginSpec = (type: PluginTypeId, driver: string) =>
  BUILTIN_PLUGIN_SPECS.find(
    (item) => item.type === type && item.driver === driver
  );
