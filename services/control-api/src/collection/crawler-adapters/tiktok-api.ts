import type { ResolvedCrawlerRouteRuntime } from '@openfons/config-center';
import type { ConfiguredCrawlerAdapter } from './types.js';

export const createTikTokApiAdapter = (
  route: ResolvedCrawlerRouteRuntime
): ConfiguredCrawlerAdapter => ({
  routeKey: route.routeKey,
  pluginId: route.collection.pluginId,
  driver: 'tiktok-api',
  enabled: true,
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
