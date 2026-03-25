import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const checks = [
  {
    name: "crawlee",
    run: async () => {
      const mod = await import("crawlee");
      return {
        ok: Boolean(mod.CheerioCrawler && mod.PlaywrightCrawler),
        detail: "CheerioCrawler and PlaywrightCrawler exported"
      };
    }
  },
  {
    name: "playwright",
    run: async () => {
      const mod = await import("playwright");
      return {
        ok: Boolean(mod.chromium),
        detail: "chromium launcher exported"
      };
    }
  },
  {
    name: "yt-dlp-exec",
    run: async () => {
      const mod = await import("yt-dlp-exec");
      return {
        ok: typeof mod.default === "function",
        detail: "default export is callable"
      };
    }
  },
  {
    name: "ytcog",
    run: async () => {
      const mod = await import("ytcog");
      return {
        ok: Boolean(mod.default || mod.Channel || mod.Search),
        detail: "package imported"
      };
    }
  },
  {
    name: "firecrawl",
    run: async () => {
      const mod = await import("firecrawl");
      return {
        ok: Boolean(mod.Firecrawl || mod.default || mod.FirecrawlApp),
        detail: "SDK imported"
      };
    }
  },
  {
    name: "pinchtab",
    run: async () => {
      const resolved = require.resolve("pinchtab");
      return {
        ok: Boolean(resolved),
        detail: resolved
      };
    }
  }
];

const results = [];

for (const check of checks) {
  try {
    const result = await check.run();
    results.push({ name: check.name, status: result.ok ? "pass" : "warn", detail: result.detail });
  } catch (error) {
    results.push({
      name: check.name,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

for (const result of results) {
  console.log(`${result.status.toUpperCase()} ${result.name}: ${result.detail}`);
}

const failed = results.some((result) => result.status === "fail");
process.exit(failed ? 1 : 0);
