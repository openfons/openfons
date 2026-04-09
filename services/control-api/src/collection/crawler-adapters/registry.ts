import {
  loadConfigCenterState,
  loadProjectBinding,
  resolveCrawlerRouteRuntime
} from '@openfons/config-center';
import { createMediaCrawlerBridgeAdapter } from './media-crawler-bridge.js';
import { createRedditPrawAdapter } from './reddit-praw.js';
import { createTikTokApiAdapter } from './tiktok-api.js';
import { createTwitterTwscrapeAdapter } from './twitter-twscrape.js';
import type { ConfiguredCrawlerAdapter } from './types.js';
import { createYoutubeYtDlpAdapter } from './youtube-yt-dlp.js';

export const buildConfiguredCrawlerAdapter = (
  route: ReturnType<typeof resolveCrawlerRouteRuntime>
): ConfiguredCrawlerAdapter => {
  switch (route.collection.driver) {
    case 'yt-dlp':
      return createYoutubeYtDlpAdapter(route);
    case 'tiktok-api':
      return createTikTokApiAdapter(route);
    case 'twscrape':
      return createTwitterTwscrapeAdapter(route);
    case 'praw':
      return createRedditPrawAdapter(route);
    case 'media-crawler':
      return createMediaCrawlerBridgeAdapter(route);
    default:
      throw new Error(`unsupported crawler driver ${route.collection.driver}`);
  }
};

export const createConfiguredCrawlerRegistry = ({
  projectId,
  repoRoot,
  secretRoot
}: {
  projectId: string;
  repoRoot: string;
  secretRoot?: string;
}) => {
  const state = loadConfigCenterState({ repoRoot, secretRoot });
  const binding = loadProjectBinding({ repoRoot, projectId });
  const routeKeys = Object.keys(binding.routes).filter((routeKey) =>
    Boolean(binding.routes[routeKey]?.collection)
  );
  const adapters = new Map<string, ConfiguredCrawlerAdapter>(
    routeKeys.map((routeKey) => {
      const route = resolveCrawlerRouteRuntime({ state, projectId, routeKey });
      return [routeKey, buildConfiguredCrawlerAdapter(route)] as const;
    })
  );

  return {
    get: (routeKey: string) => adapters.get(routeKey),
    list: () => [...adapters.values()]
  };
};
