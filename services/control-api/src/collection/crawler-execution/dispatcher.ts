import type { CrawlerExecutionPlan, CrawlerExecutionRunner } from './types.js';

export const createCrawlerExecutionDispatcher = ({
  ytDlpRunner,
  tiktokApiRunner
}: {
  ytDlpRunner: CrawlerExecutionRunner;
  tiktokApiRunner: CrawlerExecutionRunner;
}) => ({
  run: async (plan: CrawlerExecutionPlan) => {
    switch (plan.runtime.collection.driver) {
      case 'yt-dlp':
        return ytDlpRunner(plan);
      case 'tiktok-api':
        return tiktokApiRunner(plan);
      default:
        throw new Error(
          `crawler execution is not implemented for ${plan.runtime.collection.driver}`
        );
    }
  }
});
