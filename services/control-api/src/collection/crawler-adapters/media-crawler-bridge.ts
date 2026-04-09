import type { ResolvedCrawlerRouteRuntime } from '@openfons/config-center';
import type { ConfiguredCrawlerAdapter } from './types.js';

export const createMediaCrawlerBridgeAdapter = (
  route: ResolvedCrawlerRouteRuntime
): ConfiguredCrawlerAdapter => ({
  routeKey: route.routeKey,
  pluginId: route.collection.pluginId,
  driver: 'media-crawler',
  enabled: false,
  requiresAuth: route.mode === 'requires-auth',
  browserRuntime: route.browser
    ? {
        pluginId: route.browser.pluginId,
        driver: route.browser.driver
      }
    : undefined,
  accounts: route.accounts.map((item) => item.pluginId),
  cookies: route.cookies.map((item) => item.pluginId),
  proxy: route.proxy?.pluginId
});
