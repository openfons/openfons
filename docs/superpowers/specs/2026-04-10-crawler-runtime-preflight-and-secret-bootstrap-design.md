# Crawler Runtime Preflight and Secret Bootstrap Design

## Context

`v007` proved that the crawler execution path can now produce repeatable smoke artifacts, but the latest real runs failed before either crawler runner executed:

- `youtube`: `config-center validation failed for openfons: global-proxy-pool secret poolRef was not found`
- `tiktok`: `config-center validation failed for openfons: pinchtab-local secret tokenRef was not found; tiktok-account-main secret accountRef was not found; tiktok-cookie-main secret sessionRef was not found; global-proxy-pool secret poolRef was not found`

The host also lacked a usable `yt-dlp` command or `OPENFONS_YT_DLP_PATH` override. `.env_uv` was missing initially, then was created manually during smoke validation.

That means the next useful mainline is not another crawler adapter. The current gap is operator readiness: operators need a route-aware way to inspect host dependencies and secret material before running the smoke command.

## Problem Statement

The current runbook can tell an operator what to prepare, and the smoke harness can now persist structured failure artifacts. But that is still too late and too manual:

- config-center validation reports project/route failures only when the resolver is invoked
- smoke execution is the first place where route-specific host dependencies and secret gaps are visible together
- missing secret files, placeholder secret files, invalid JSON, and expired cookie material are not presented as an actionable checklist
- there is no safe bootstrap path for creating the expected secret directory and placeholder files without writing real credentials into the repo

The system needs a preflight layer that can answer:

> For route `youtube` or `tiktok`, is this machine and secret root ready to run the crawler smoke? If not, what exact action should the operator take next?

## Approaches Considered

### Approach A: Expand the runbook only

This is low risk, but it keeps the workflow manual. It would not detect whether the current machine has `yt-dlp`, whether `OPENFONS_SECRET_ROOT` points at the expected directory, or whether files contain placeholder content instead of real material.

Result: rejected. It would preserve the current failure mode with nicer prose.

### Approach B: Add only a `control-api` diagnostics endpoint

An API endpoint is useful for platform reuse, but the immediate blocker is local operator readiness. A remote-style endpoint also should not write secret placeholders or mutate the host machine.

Result: insufficient by itself. The API should be read-only and share a core with a local CLI.

### Approach C: Shared route-aware preflight core, read-only API, and local CLI bootstrap

This keeps diagnostics reusable while preserving safe boundaries:

- a shared backend preflight core computes route-specific checks
- `control-api` exposes a read-only diagnostics endpoint
- a local workbench CLI prints the same JSON and, only when explicitly requested, creates missing placeholder secret files and `.env_uv`

Result: recommended. This is the smallest path that turns the `v007` smoke blockers into a repeatable operator workflow without expanding crawler scope.

## Goals

- Add route-aware diagnostics for `youtube` and `tiktok`.
- Detect host dependencies:
  - `yt-dlp` or `OPENFONS_YT_DLP_PATH` for YouTube
  - `uv`, `.env_uv` Python, `pyproject.toml`, and the TikTok bridge script for TikTok
- Detect route-bound secrets:
  - `global-proxy-pool`
  - `pinchtab-token`
  - `tiktok-account-main`
  - `tiktok-cookie-main`
- Distinguish `missing`, `placeholder`, `invalid`, and `ok` secret states.
- Provide candidate file paths and concrete next-step guidance.
- Provide a safe local bootstrap path that never overwrites existing secrets and never writes real credentials.
- Update the smoke runbook to start with diagnostics before smoke execution.

## Non-Goals

- Do not add `twscrape`, `PRAW`, or `MediaCrawler` execution.
- Do not create a config-center write API or UI.
- Do not automatically download `yt-dlp`.
- Do not fetch real TikTok cookies, accounts, proxy pools, or PinchTab tokens.
- Do not solve anti-bot, captcha, or long-lived session maintenance.
- Do not make placeholder secrets count as ready.

## Core Design

### 1. Keep host diagnostics out of `packages/config-center`

`packages/config-center` should continue to own config loading, secret-reference resolution, and validation. It should not own machine-local binary discovery.

Route preflight belongs under the control-api crawler execution slice because it needs both:

- config-center graph knowledge
- process-level host checks such as `uv`, `.env_uv`, and `yt-dlp`

Recommended location:

```text
services/control-api/src/collection/crawler-execution/preflight.ts
```

### 2. Use shared contracts for report shape

The report will be returned by a `control-api` endpoint and printed by a workbench CLI, so the schema should live in `packages/contracts`.

The report should include:

- `projectId`
- `routeKey`
- `status`: `ready | blocked`
- `route`: route mode and driver summary when discoverable
- `hostChecks`
- `secretChecks`
- `bootstrapActions`
- `nextSteps`

Checks should use explicit states:

- `ok`
- `missing`
- `placeholder`
- `invalid`
- `skipped`

Any non-`ok` route-critical check blocks smoke execution.

### 3. Secret checks must be route-specific

YouTube should not require TikTok-specific secrets. TikTok should include the `pinchtab-local` browser token because the configured route binding references it, even though the current smoke runner consumes account/cookie/proxy directly.

Required checks:

- YouTube:
  - `global-proxy-pool`
- TikTok:
  - `pinchtab-token`
  - `tiktok-account-main`
  - `tiktok-cookie-main`
  - `global-proxy-pool`

The checker must distinguish logical secret names from on-disk file candidates. The secret store probes:

```text
<name>
<name>.txt
<name>.json
```

### 4. Placeholder bootstrap must not create false readiness

The CLI may create missing placeholder files only when the operator passes an explicit flag such as `--bootstrap-missing`.

Bootstrap writes must be safe:

- create `$OPENFONS_SECRET_ROOT/project/openfons` if missing
- create only missing files
- never overwrite existing files
- write obvious placeholders such as `REPLACE_WITH_PINCHTAB_TOKEN`
- detect those placeholders later and keep the route blocked

Expected placeholder files:

```text
pinchtab-token
tiktok-account-main.json
tiktok-cookie-main
global-proxy-pool.json
```

Suggested stub content:

- `pinchtab-token`: `REPLACE_WITH_PINCHTAB_TOKEN`
- `tiktok-account-main.json`: `{ "username": "REPLACE_ME", "password": "REPLACE_ME" }`
- `tiktok-cookie-main`: `REPLACE_WITH_NETSCAPE_COOKIE_FILE_CONTAINING_MS_TOKEN`
- `global-proxy-pool.json`: `[ { "endpoint": "http://REPLACE_ME:PORT" } ]`

### 5. API stays read-only

The `control-api` endpoint should diagnose only. It should not bootstrap or mutate local secrets because the API boundary may eventually be reachable outside a local operator shell.

Recommended endpoint:

```text
POST /api/v1/config/projects/:projectId/routes/:routeKey/preflight
```

The endpoint returns the same report shape as the CLI.

### 6. CLI owns local bootstrap

The workbench CLI should be the only bootstrap entrypoint in this phase:

```powershell
pnpm exec tsx scripts/workbench/doctor-crawler-runtime.ts --route youtube
pnpm exec tsx scripts/workbench/doctor-crawler-runtime.ts --route tiktok --bootstrap-missing
```

Default behavior:

- print JSON
- exit `0` when status is `ready`
- exit `1` when status is `blocked`

Bootstrap behavior:

- create missing placeholder secret files
- initialize `.env_uv` only when requested and `uv` is available
- still exit `1` when placeholders remain, because placeholders are not real credentials

## Error Handling

- Missing route: return a blocked report with a `missing_route` check.
- Missing host command: return a blocked host check with the exact environment override to set.
- Missing secret: return candidate paths and the route that requires it.
- Placeholder secret: return blocked status and tell the operator to replace the placeholder with real material.
- Invalid JSON secret: return blocked status with the parse/shape error, without printing secret contents.
- Cookie without `ms_token` / `msToken`: return blocked or warning status for TikTok, without echoing the cookie blob.

## Testing Strategy

- Contract tests for the diagnostic report schema.
- Integration tests for the preflight core with temporary secret roots:
  - YouTube with missing proxy secret
  - YouTube with placeholder proxy secret
  - YouTube with valid proxy secret but missing `yt-dlp`
  - TikTok with all four secrets missing
  - TikTok with placeholder account/cookie/token/proxy stubs
  - TikTok with valid files and `.env_uv` present
- API integration test for the read-only endpoint.
- CLI integration test for JSON output, blocked exit status, and `--bootstrap-missing` creating missing placeholders without overwriting existing files.

## Acceptance Signals

- The new diagnostics command reports the current `v007` blocker state before smoke is run.
- `--bootstrap-missing` creates missing placeholder files under the selected `OPENFONS_SECRET_ROOT` and keeps the report blocked because placeholders are not real credentials.
- The `control-api` preflight endpoint returns the same structured issue categories without exposing secret values.
- The runbook starts with diagnostics before smoke execution.
- After this phase, the next decision can be based on a narrower report: missing host tools, placeholder secrets, invalid secret formats, or actual crawler execution failure.
