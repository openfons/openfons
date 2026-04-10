# Crawler Execution Smoke Runbook

## Windows-first prerequisites

```powershell
# Optional when the executables are not on PATH:
# $env:OPENFONS_UV_PATH = "C:\tools\uv.exe"
# $env:OPENFONS_YT_DLP_PATH = "C:\tools\yt-dlp.exe"
$ErrorActionPreference = 'Stop'
$uvCommand = if ($env:OPENFONS_UV_PATH) {
  $env:OPENFONS_UV_PATH
} else {
  (Get-Command uv -ErrorAction Stop).Source
}
$ytDlpCommand = if ($env:OPENFONS_YT_DLP_PATH) {
  $env:OPENFONS_YT_DLP_PATH
} else {
  (Get-Command yt-dlp -ErrorAction Stop).Source
}
& $uvCommand --version
& $ytDlpCommand --version
if (-not (Test-Path '.\\.env_uv\\Scripts\\python.exe')) {
  & $uvCommand venv .env_uv
}
& $uvCommand sync --python .\\.env_uv\\Scripts\\python.exe
```

The smoke harness relies on the same bridge that `services/control-api/src/collection/crawler-execution/tiktok-api-runner.ts` uses, so the repo-root `.env_uv` must expose a Windows Python interpreter at `repoRoot\\.env_uv\\Scripts\\python.exe` (non-Windows clients read `repoRoot/.env_uv/bin/python`).  `uv` is resolved via `OPENFONS_UV_PATH` before falling back to `uv`/`uv.exe`, and `yt-dlp` is resolved via `OPENFONS_YT_DLP_PATH` before `yt-dlp`/`yt-dlp.exe`.

## Environment variables

- Use this baseline setup before running either smoke command:

  ```powershell
  $env:OPENFONS_SECRET_ROOT = "$env:USERPROFILE\\.openfons\\secrets"
  $env:OPENFONS_SMOKE_YOUTUBE_URL = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"
  $env:OPENFONS_SMOKE_TIKTOK_URL = "https://www.tiktok.com/@scout2015"
  ```

- `OPENFONS_SECRET_ROOT` is required and must point to the directory that contains `project/openfons` secrets.

- `OPENFONS_SMOKE_YOUTUBE_URL` and `OPENFONS_SMOKE_TIKTOK_URL` control the smoke capture targets and default to the values encoded in `services/control-api/src/collection/crawler-execution/smoke.ts`.  Override them when you need a different production URL.

- `OPENFONS_YT_DLP_PATH` can point at a curated `yt-dlp` build if the host command is unavailable.

- `OPENFONS_UV_PATH` can pin `uv`/`uv.exe` if the bootstrapper is not on the system `PATH`.

## Secret layout for `project/openfons`

The project bindings and plugin instances reference these secret names:

- `pinchtab-token`
- `tiktok-account-main`
- `tiktok-cookie-main`
- `global-proxy-pool`

The config-center secret store resolves each name by probing `<name>`, `<name>.txt`, and `<name>.json`. In the current project setup, the expected on-disk files are:

- `$env:OPENFONS_SECRET_ROOT\\project\\openfons\\pinchtab-token`
- `$env:OPENFONS_SECRET_ROOT\\project\\openfons\\tiktok-account-main.json`
- `$env:OPENFONS_SECRET_ROOT\\project\\openfons\\tiktok-cookie-main`
- `$env:OPENFONS_SECRET_ROOT\\project\\openfons\\global-proxy-pool.json`

Route-specific minimums:

- YouTube smoke: `global-proxy-pool.json`
- TikTok smoke: `pinchtab-token`, `tiktok-account-main.json`, `tiktok-cookie-main`, and `global-proxy-pool.json`
- The current smoke runner consumes account/cookie/proxy directly, but the `tiktok` route binding still includes `pinchtab-local`, so keep the browser token in the same project secret inventory

## YouTube smoke

```powershell
pnpm exec tsx scripts/workbench/smoke-crawler-execution.ts `
  --route youtube `
  --out docs/workbench/generated/crawler-execution-smoke-youtube.json
Get-Content docs/workbench/generated/crawler-execution-smoke-youtube.json
```

Success signal: the JSON output contains `"status": "success"` and the runtime section reports `"driver": "yt-dlp"`, proving the harness resolved the `youtube` route with the `yt-dlp` runner.

## TikTok smoke

```powershell
pnpm exec tsx scripts/workbench/smoke-crawler-execution.ts `
  --route tiktok `
  --out docs/workbench/generated/crawler-execution-smoke-tiktok.json
Get-Content docs/workbench/generated/crawler-execution-smoke-tiktok.json
```

Success signal: the JSON output contains `"status": "success"` and the runtime section reports `"driver": "tiktok-api"`, confirming the TikTok runner bridged its `uv`/`.env_uv` Python process successfully.

## Failure triage

- Missing `yt-dlp`: install `yt-dlp` on the machine or point `OPENFONS_YT_DLP_PATH` to a working executable, then re-run the smoke command.
- Missing `.env_uv` Python: make sure `repoRoot\\.env_uv\\Scripts\\python.exe` exists by running the prerequisite block again; if `uv` is not on `PATH`, set `OPENFONS_UV_PATH` first so the same bootstrap flow can create `.env_uv` and run `sync`.
- Missing `uv`: install `uv` or supply `OPENFONS_UV_PATH` so the TikTok bridge can launch the typed Python runtime (`uv` > `uv.exe` from `uv` candidates list).
- Missing secret material under `$env:OPENFONS_SECRET_ROOT\\project\\openfons\\*`: restore the files required by the route you are running. `youtube` needs `global-proxy-pool.json`; `tiktok` needs `pinchtab-token`, `tiktok-account-main.json`, `tiktok-cookie-main`, and `global-proxy-pool.json`.
- Expired TikTok session: refresh the `tiktok-cookie-main` payload with a new `ms_token`/`msToken` pair so the runtime cookie secret yields a valid session before the next smoke run.

## Self-review checklist

- `.env_uv` guidance matches `services/control-api/src/collection/crawler-execution/tiktok-api-runner.ts`, which resolves the Windows interpreter at `repoRoot\\.env_uv\\Scripts\\python.exe`.
- `uv` and `yt-dlp` prerequisite guidance matches `services/control-api/src/collection/crawler-execution/tiktok-api-runner.ts` and `services/control-api/src/collection/crawler-execution/tooling.ts`: `OPENFONS_UV_PATH` overrides `uv`/`uv.exe`, and `OPENFONS_YT_DLP_PATH` overrides `yt-dlp`/`yt-dlp.exe`.
- Secret guidance matches `config/projects/openfons/plugins/bindings.json`, the related plugin instances, and `packages/config-center/src/secret-store.ts`: bindings reference logical secret names, while the secret store probes `<name>`, `<name>.txt`, and `<name>.json`.
- Both smoke commands target the Task 1 CLI entrypoint at `scripts/workbench/smoke-crawler-execution.ts`, which wraps `services/control-api/src/collection/crawler-execution/smoke.ts`.

## Latest recorded result

### YouTube

- Date: 2026-04-10
- Status: error
- Driver: unresolved
- Capture summary: unavailable
- Blockers: config-center validation failed for openfons: global-proxy-pool secret poolRef was not found

### TikTok

- Date: 2026-04-10
- Status: error
- Driver: unresolved
- Capture summary: unavailable
- Blockers: config-center validation failed for openfons: pinchtab-local secret tokenRef was not found; tiktok-account-main secret accountRef was not found; tiktok-cookie-main secret sessionRef was not found; global-proxy-pool secret poolRef was not found
