import ytcog from "ytcog";
import ytDlp from "yt-dlp-exec";

const checks = [
  {
    name: "YouTube / yt-dlp",
    run: async () => {
      const data = await ytDlp("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
        dumpSingleJson: true,
        skipDownload: true,
        noWarnings: true,
        noCallHome: true
      });
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return {
        status: "pass",
        detail: `${parsed.id} | ${parsed.channel} | ${parsed.title}`
      };
    }
  },
  {
    name: "YouTube / ytcog search",
    run: async () => {
      const { Session, Search } = ytcog;
      const session = new Session();
      await session.fetch();
      const search = new Search(session, { query: "open source intelligence", quantity: 3 });
      await search.fetch();
      const count = search.videos?.length || 0;
      const first = search.videos?.[0]?.title || "none";
      if (session.status === "OK" && count > 0) {
        return { status: "pass", detail: `status=${session.status} count=${count} first=${first}` };
      }
      return { status: "warn", detail: `status=${session.status} count=${count} first=${first}` };
    }
  }
];

const results = [];

for (const check of checks) {
  try {
    results.push({ name: check.name, ...(await check.run()) });
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

if (results.some((result) => result.status === "fail")) {
  process.exit(1);
}
