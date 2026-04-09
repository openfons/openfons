import type { ResolvedCrawlerRouteRuntime } from '@openfons/config-center';
import type { ConfiguredCrawlerAdapter } from './types.js';

export const createYoutubeYtDlpAdapter = (
  route: ResolvedCrawlerRouteRuntime
): ConfiguredCrawlerAdapter => ({
  routeKey: route.routeKey,
  pluginId: route.collection.pluginId,
  driver: 'yt-dlp',
  enabled: true,
  requiresAuth: route.mode === 'requires-auth',
  accounts: route.accounts.map((item) => item.pluginId),
  cookies: route.cookies.map((item) => item.pluginId),
  proxy: route.proxy?.pluginId
});
