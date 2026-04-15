export type ConfiguredCrawlerAdapterDriver =
  | 'yt-dlp'
  | 'tiktok-api'
  | 'hacker-news-api'
  | 'twscrape'
  | 'praw'
  | 'media-crawler';

export type ConfiguredCrawlerAdapter = {
  routeKey: string;
  pluginId: string;
  driver: ConfiguredCrawlerAdapterDriver;
  enabled: boolean;
  requiresAuth: boolean;
  browserRuntime?: {
    pluginId: string;
    driver: string;
  };
  accounts: string[];
  cookies: string[];
  proxy?: string;
};
