import type { ResolvedCrawlerRouteRuntime } from '@openfons/config-center';
import type { ConfiguredCrawlerAdapter } from './types.js';

export const createTwitterTwscrapeAdapter = (
  route: ResolvedCrawlerRouteRuntime
): ConfiguredCrawlerAdapter => ({
  routeKey: route.routeKey,
  pluginId: route.collection.pluginId,
  driver: 'twscrape',
  enabled: true,
  requiresAuth: route.mode === 'requires-auth',
  accounts: route.accounts.map((item) => item.pluginId),
  cookies: route.cookies.map((item) => item.pluginId),
  proxy: route.proxy?.pluginId
});
