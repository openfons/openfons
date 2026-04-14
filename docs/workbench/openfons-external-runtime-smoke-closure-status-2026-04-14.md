# OpenFons External Runtime / Smoke Closure Status - 2026-04-14

## One-Sentence Conclusion

External `youtube / tiktok` smoke is still not formally closed, but the current blocker is external host/material readiness rather than missing internal route, preflight, or runner code.

## Current Evidence

The following checks were rerun on 2026-04-14 from the repository root.

### YouTube Preflight

Command:

```powershell
pnpm --silent doctor:crawler-runtime -- --route youtube --secret-root "$env:USERPROFILE\.openfons\secrets"
```

Result:

- status: `blocked`
- route resolved: `youtube`
- driver: `yt-dlp`
- host blocker: `yt-dlp was not found on PATH and OPENFONS_YT_DLP_PATH is not set`
- secret blocker: `global-proxy-pool secret poolRef still contains placeholder proxy endpoints`

Artifact:

- `docs/workbench/generated/crawler-runtime-preflight-youtube.json`

### YouTube Smoke

Command:

```powershell
$env:OPENFONS_SECRET_ROOT = "$env:USERPROFILE\.openfons\secrets"
pnpm exec tsx scripts/workbench/smoke-crawler-execution.ts --route youtube --out docs/workbench/generated/crawler-execution-smoke-youtube.json
```

Result:

- status: `error`
- runtime resolved: `youtube / yt-dlp / public-first`
- execution blocker: `yt-dlp.exe failed: spawn yt-dlp.exe ENOENT`

Artifact:

- `docs/workbench/generated/crawler-execution-smoke-youtube.json`

### TikTok Preflight

Command:

```powershell
pnpm --silent doctor:crawler-runtime -- --route tiktok --secret-root "$env:USERPROFILE\.openfons\secrets"
```

Result:

- status: `blocked`
- route resolved: `tiktok`
- driver: `tiktok-api`
- host checks OK:
  - `uv`
  - `.env_uv` Python
  - `pyproject.toml`
  - `tiktok_api_capture.py`
- secret blockers:
  - `pinchtab-token` still contains placeholder token
  - `tiktok-account-main.json` still contains placeholder credentials
  - `tiktok-cookie-main` still contains placeholder cookie file
  - `global-proxy-pool.json` still contains placeholder proxy endpoints

Artifact:

- `docs/workbench/generated/crawler-runtime-preflight-tiktok.json`

### TikTok Smoke

Command:

```powershell
$env:OPENFONS_SECRET_ROOT = "$env:USERPROFILE\.openfons\secrets"
pnpm exec tsx scripts/workbench/smoke-crawler-execution.ts --route tiktok --out docs/workbench/generated/crawler-execution-smoke-tiktok.json
```

Result:

- status: `error`
- runtime resolved: `tiktok / tiktok-api / requires-auth`
- execution blocker: `invalid bridge input: cookie file must provide ms_token/msToken`

Artifact:

- `docs/workbench/generated/crawler-execution-smoke-tiktok.json`

## What Is Already Internally Closed

- `config-center` can resolve crawler/browser/account/cookie/proxy route bindings.
- route-aware runtime preflight exists.
- local operator commands exist:
  - `pnpm doctor:crawler-runtime`
  - `pnpm smoke:crawler-execution`
- the smoke harness can resolve `youtube` and `tiktok` runtime routes.
- the runners are reached:
  - YouTube reaches the `yt-dlp` runner and then fails on missing binary.
  - TikTok reaches the `tiktok-api` runner and then fails on invalid placeholder cookie material.

## What Is Not Closed

- No successful `youtube` real smoke artifact exists yet.
- No successful `tiktok` real smoke artifact exists yet.
- `yt-dlp` is not available on this machine through PATH or `OPENFONS_YT_DLP_PATH`.
- the secret files under `C:\Users\AI\.openfons\secrets\project\openfons\` are still placeholders or not operationally valid for smoke.

## Fair Judgment

It is not fair to call this a crawler-code gap anymore. The current code path can get far enough to resolve the route and invoke the intended runner.

It is also not fair to call external smoke complete. The system has not produced a successful real capture artifact for either route.

The right status is:

`external-blocked: waiting for real host binary and real operator-managed secret/cookie/proxy material`

## Re-Entry Conditions

Resume external smoke only after the route-specific blocker set is resolved:

1. For `youtube`:
   - a working `yt-dlp` executable is installed or `OPENFONS_YT_DLP_PATH` points to one
   - `global-proxy-pool.json` is replaced with a real proxy pool, or the route policy is explicitly changed to allow no-proxy YouTube smoke
2. For `tiktok`:
   - `tiktok-cookie-main` is replaced with a real cookie payload containing `ms_token` or `msToken`
   - `tiktok-account-main.json` is replaced with real account material if the selected runner path still requires it
   - `pinchtab-token` is replaced with a real token, or the route binding is changed to remove the browser dependency for this smoke path
   - `global-proxy-pool.json` is replaced with a real proxy pool if the selected route still requires proxy

After that, run in this order:

```powershell
pnpm --silent doctor:crawler-runtime -- --route youtube --secret-root "$env:USERPROFILE\.openfons\secrets"
pnpm --silent doctor:crawler-runtime -- --route tiktok --secret-root "$env:USERPROFILE\.openfons\secrets"
```

Only if preflight is no longer blocked:

```powershell
$env:OPENFONS_SECRET_ROOT = "$env:USERPROFILE\.openfons\secrets"
pnpm exec tsx scripts/workbench/smoke-crawler-execution.ts --route youtube --out docs/workbench/generated/crawler-execution-smoke-youtube.json
pnpm exec tsx scripts/workbench/smoke-crawler-execution.ts --route tiktok --out docs/workbench/generated/crawler-execution-smoke-tiktok.json
```

## What Not To Do Next

- Do not expand into `twscrape / PRAW / MediaCrawler` before the current `youtube / tiktok` smoke blocker is resolved.
- Do not claim the current smoke as successful.
- Do not commit real secret material.
- Do not silently auto-install `yt-dlp` unless the user explicitly widens scope to include host tool installation.

## Recommended Next Mainline

Continue `v015`: `Intent Structuring -> Planning Swarm -> Opportunity Judge -> OpportunitySpec`.

External runtime / smoke should stay as a re-entry track that resumes when the external materials above are available.
