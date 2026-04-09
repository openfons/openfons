# Crawler Execution Closure Design

## Context

As of 2026-04-09, OpenFons has already finished the platform-level config-center mainline:

- `packages/config-center` resolves project-bound `crawler / browser / account / cookie / proxy` runtime inputs
- `services/control-api` exposes masked config-center views and validation
- `services/control-api/src/collection/crawler-adapters/registry.ts` can resolve route-aware crawler adapters
- `real-collection-bridge` can detect when a target URL maps to a configured crawler route

What is still missing is the data-plane half of that story.

Today the bridge can say:

- “this target resolved to `yt-dlp`”
- or “this target resolved to `tiktok-api`”

But it still does not actually run those tools. After route resolution it falls back to the old generic `capture-runner`, which means the platform can describe crawler adapters but cannot yet turn them into real collection output.

## Problem Statement

The current gap is not config discovery. The current gap is executable closure:

> once a route resolves to a crawler adapter, OpenFons still lacks a narrow execution layer that can run the corresponding tool, normalize the result into current compile outputs, and fail explicitly when host dependencies or auth material are not usable.

If this gap stays open, two bad outcomes follow:

1. config-center becomes a pure control-plane shell with no real crawler payoff
2. future crawler work will be tempted to bypass config-center and re-invent secrets, route resolution, and fallback behavior inside ad hoc scripts

## Goals

- Add a narrow `crawler-execution` layer under `services/control-api/src/collection/`.
- Keep a strict split between:
  - management-safe adapter description used for inspection and routing
  - backend-only executable runtime that may hold raw resolved secrets
- Support real execution for exactly two drivers first:
  - `yt-dlp`
  - `tiktok-api`
- Keep `capture-runner` as the public-page path.
- Keep compile fallback explicit and observable when crawler execution fails.

## Non-Goals

- This phase does not execute `twscrape`, `PRAW`, or `MediaCrawler`.
- This phase does not add config-center write APIs or a config UI.
- This phase does not persist raw crawler stdout/stderr as first-class product artifacts.
- This phase does not solve platform anti-bot issues in general.
- This phase does not merge authenticated local-browser and crawler execution into one collector.

## Core Design Decision

### 1. Do not execute from `ConfiguredCrawlerAdapter`

`ConfiguredCrawlerAdapter` is intentionally lightweight and safe to log:

- route key
- plugin id
- driver
- browser/account/cookie/proxy plugin ids

That shape is correct for detection and debugging, but wrong for execution because it does not contain raw secret values.

Real execution must instead use backend-only runtime data derived from:

- `loadConfigCenterState()`
- `resolveCrawlerRouteRuntime()`

This keeps the security boundary intact:

- safe summary for logs and route selection
- raw runtime only for backend execution

### 2. Add a separate `crawler-execution` slice

Do not keep extending `capture-runner` with auth-heavy, driver-specific logic.

The new slice should own:

- route-to-executable-runtime resolution
- host dependency discovery
- driver-specific process execution
- normalization into `SourceCapture` + `CollectionLog`

The recommended file boundary is:

```text
services/control-api/src/collection/
  crawler-execution/
    types.ts
    runtime.ts
    tooling.ts
    dispatcher.ts
    yt-dlp-runner.ts
    tiktok-api-runner.ts
services/control-api/scripts/crawlers/
  tiktok_api_capture.py
```

### 3. Host dependency discovery stays process-level, not project-binding-level

Config-center should continue to own:

- route binding
- plugin dependency closure
- secret resolution

It should not start owning machine-local binary discovery.

Binary and interpreter discovery should stay in the execution layer through host-level resolution such as:

- `OPENFONS_YT_DLP_PATH` or `PATH`
- `uv` plus project-root `.env_uv`

This is consistent with existing `capture-runner` behavior for browser and curl binaries:

- config-center resolves product runtime truth
- host discovery resolves machine tools

### 4. Normalize results into the current compile contract

This phase should not widen `SourceCaptureSchema`.

Instead, each runner should map tool output into the existing shape:

- `title`, `url`, `captureType`, `language`, `region` come from the current plan/target
- `summary` is synthesized from real tool output
- `CollectionLog` records which adapter ran and whether fallback or degraded behavior occurred

Raw stdout/stderr persistence is deferred. For v1 of this execution layer, the compile chain only needs:

- real summary text
- explicit success/failure logs

### 5. Failure semantics stay explicit

The current compile contract already has a good failure boundary:

- runner/bridge throws `AiProcurementRuntimeError`
- compiler falls back explicitly via `addAiProcurementFallbackWarning()`

v006 should preserve that exact pattern.

Important rule:

- adapter-backed failure must never silently downgrade into generic `capture-runner`
- compile fallback may happen, but only through the existing explicit runtime-error path

## Driver Scope

### `yt-dlp`

Why first:

- already proven valuable in prior experiments
- can run as a single external command without introducing a browser service
- matches the current `youtube` route in project bindings

Expected input:

- canonical URL
- optional proxy pool selection
- optional cookie material later if YouTube anti-bot pressure requires it

Expected output:

- summary synthesized from `yt-dlp --dump-single-json`
- structured failure when command is missing, exits non-zero, or returns malformed JSON

### `tiktok-api`

Why second:

- current bindings already declare `browser / account / cookie / proxy` dependencies for the `tiktok` route
- it is the first route that proves config-center is not only for discovery, but also for auth-heavy crawler execution

Expected input:

- canonical TikTok URL
- cookie source resolved from config-center
- account JSON resolved from config-center
- proxy endpoint selected from resolved proxy pool

Expected execution model:

- Node dispatches to a repo-owned Python bridge script
- Python environment is managed through project-root `.env_uv`
- the Python side returns normalized JSON, not arbitrary text scraping blobs

## Safety Rules

1. `capture-runner` remains the public-page collector.
2. `crawler-execution` only runs for route-backed targets with implemented runners.
3. Route-backed execution failure raises `AiProcurementRuntimeError`.
4. Compiler fallback remains explicit and test-covered.
5. `twscrape / PRAW / MediaCrawler` stay descriptor-only in this phase.

## Delivery Order

1. executable runtime boundary and dispatcher
2. `yt-dlp` runner
3. `tiktok-api` Python bridge runner
4. `real-collection-bridge` integration and regression coverage

## Acceptance Signals

- `youtube` route can execute a real `yt-dlp` runner and produce a non-fixture `SourceCapture.summary`
- `tiktok` route can execute a real Python bridge runner and consume config-center resolved auth resources
- missing `yt-dlp`, missing `.env_uv`, invalid cookie/account material, or non-zero runner exits become explicit runtime errors with visible logs
- the compile API still returns deterministic fallback output when crawler execution fails, and the failure cause is visible in collection logs

## Final Summary

`goal_v006` is not another config-center phase. It is the first phase that converts the config-center crawler graph into actual collection work.

The central design choice is simple:

- keep route description safe
- keep route execution backend-only
- keep public capture and crawler execution separate
- keep fallback explicit

That is the smallest path that turns the current platform from “can resolve crawler adapters” into “can actually use them.”
