import {
  loadConfigCenterState,
  loadProjectBinding,
  resolveCrawlerRouteRuntime
} from '@openfons/config-center';
import { resolveSiteProfile } from '../authenticated-local-browser/site-profiles.js';
import { createMediaCrawlerBridgeAdapter } from './media-crawler-bridge.js';
import { createHackerNewsApiAdapter } from './hacker-news-api.js';
import { createRedditPrawAdapter } from './reddit-praw.js';
import { createTikTokApiAdapter } from './tiktok-api.js';
import { createTwitterTwscrapeAdapter } from './twitter-twscrape.js';
import type { ConfiguredCrawlerAdapter } from './types.js';
import { createYoutubeYtDlpAdapter } from './youtube-yt-dlp.js';

const URL_ROUTE_ALIASES: Record<string, string[]> = {
  'youtu.be': ['youtube'],
  youtu: ['youtube'],
  'news.ycombinator.com': ['hacker-news'],
  'hacker-news.firebaseio.com': ['hacker-news']
};

const pushUnique = (
  candidates: string[],
  seen: Set<string>,
  candidate: string | undefined
) => {
  if (!candidate) {
    return;
  }

  const normalized = candidate.trim().toLowerCase();
  if (!normalized || seen.has(normalized)) {
    return;
  }

  seen.add(normalized);
  candidates.push(normalized);

  for (const alias of URL_ROUTE_ALIASES[normalized] ?? []) {
    pushUnique(candidates, seen, alias);
  }
};

const pushHostnameCandidates = (
  candidates: string[],
  seen: Set<string>,
  hostname: string
) => {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) {
    return;
  }

  pushUnique(candidates, seen, normalized);

  const parts = normalized.split('.').filter(Boolean);
  for (let index = 0; index < parts.length - 1; index += 1) {
    pushUnique(candidates, seen, parts.slice(index).join('.'));
  }

  if (parts.length >= 2) {
    pushUnique(candidates, seen, parts[parts.length - 2]);
  }
};

export const resolveCrawlerRouteKeyForUrl = ({
  routeKeys,
  url
}: {
  routeKeys: string[];
  url: string;
}) => {
  const hostname = new URL(url).hostname.toLowerCase();
  const candidates: string[] = [];
  const seen = new Set<string>();
  pushHostnameCandidates(candidates, seen, hostname);

  const siteProfile = resolveSiteProfile(url);
  if (siteProfile) {
    pushUnique(candidates, seen, siteProfile.id);
    for (const profileHostname of siteProfile.hostnames) {
      pushHostnameCandidates(candidates, seen, profileHostname);
    }
  }

  const matched = candidates.find((candidate) =>
    routeKeys.some((routeKey) => routeKey.toLowerCase() === candidate)
  );

  if (!matched) {
    return undefined;
  }

  return routeKeys.find((routeKey) => routeKey.toLowerCase() === matched);
};

export const buildConfiguredCrawlerAdapter = (
  route: ReturnType<typeof resolveCrawlerRouteRuntime>
): ConfiguredCrawlerAdapter => {
  switch (route.collection.driver) {
    case 'yt-dlp':
      return createYoutubeYtDlpAdapter(route);
    case 'tiktok-api':
      return createTikTokApiAdapter(route);
    case 'hacker-news-api':
      return createHackerNewsApiAdapter(route);
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
  const routeKeySet = new Set(routeKeys);
  const adapters = new Map<string, ConfiguredCrawlerAdapter>();
  const resolveAdapter = (routeKey: string) => {
    if (!routeKeySet.has(routeKey)) {
      return undefined;
    }

    let adapter = adapters.get(routeKey);
    if (!adapter) {
      const route = resolveCrawlerRouteRuntime({ state, projectId, routeKey });
      adapter = buildConfiguredCrawlerAdapter(route);
      adapters.set(routeKey, adapter);
    }

    return adapter;
  };

  return {
    get: (routeKey: string) => resolveAdapter(routeKey),
    findByUrl: (url: string) => {
      const routeKey = resolveCrawlerRouteKeyForUrl({ routeKeys, url });
      return routeKey ? resolveAdapter(routeKey) : undefined;
    },
    list: () =>
      routeKeys
        .map((routeKey) => resolveAdapter(routeKey))
        .filter((adapter): adapter is ConfiguredCrawlerAdapter =>
          adapter !== undefined
        )
  };
};
