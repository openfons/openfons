# Authenticated Local Browser Collector Design

## Context

As of 2026-04-06, OpenFons already has a real public collection path:

- search discovery via `search-gateway`
- capture via `capture-runner`
- evidence normalization via `compiler`
- bounded policy failures such as `needs_authenticated_capture`

What is still missing is a disciplined answer to the next escalation step. Today the codebase can fall back to a lightweight `browser-dom` capture for a few public pages, but it does not yet define a proper operator-owned authenticated browser slice for dynamic or login-sensitive sites.

This design adds that missing slice without changing the current default runtime:

- public/search-first stays the main path
- authenticated local-browser stays opt-in and policy-driven
- report truth still depends on preserved artifacts, not on opaque browser success

## Problem Statement

Some in-scope collection targets cannot be served well by plain HTTP or stateless headless browser capture:

- social feeds that reveal more state when logged in
- app-shell pages that need clicks, scroll, or expansion before useful evidence exists
- upload or session-bound flows where the useful answer only appears after controlled interaction

If OpenFons handles these cases ad hoc, two problems appear quickly:

1. the system silently drifts toward browser-first collection
2. authenticated capture succeeds operationally but produces weak or non-auditable evidence

The missing requirement is therefore not "add another browser tool." The missing requirement is:

> define a narrow authenticated local-browser collector that can be invoked explicitly, produces auditable artifacts, and remains outside the default happy path until policy or site pressure requires it.

## Goals

- Define the interface for an `authenticated-local-browser` collector request.
- Define a small state machine for operator-approved browser capture.
- Define a minimal `SiteProfile` layer so domain-specific collector policy is structured rather than prompt-only.
- Keep the new collector outside the default `capture-runner` happy path.
- Keep artifacts evidence-friendly: HTML/DOM, screenshots, interaction logs, and session notes.

## Non-Goals

- This phase does not build a full browser worker service.
- This phase does not add persistence or cross-run session storage.
- This phase does not auto-extract browser cookies from the operator machine.
- This phase does not make authenticated capture the default path for social sites.
- This phase does not bypass product policy or unsupported-domain gates.

## Recommended Responsibility Split

### 1. Public collection stays where it is

- `search-gateway` selects public discovery targets.
- `capture-runner` handles HTTP, curl, and lightweight browser DOM fallbacks for public pages.
- `real-collection-bridge` keeps building the default evidence-backed case bundle.

### 2. Authenticated local-browser is a separate escalation layer

The new collector is not a replacement for `capture-runner`. It is a later-stage escalation target when one of these conditions is true:

- compile policy classifies the request as `needs_authenticated_capture`
- a matched `SiteProfile` says the useful state usually lives behind login or heavy interaction
- operator review explicitly approves a local-browser run for a bounded target

### 3. Evidence remains the system of record

The output of authenticated browser work must still be normalized into OpenFons artifacts and evidence objects. "The browser reached the page" is not enough. The collector should at minimum preserve:

- final resolved URL
- page HTML or serialized DOM
- screenshot
- interaction log
- session note indicating whether login state was used

## Proposed Interface

The minimal request shape should include:

- target title and URL
- resolved `SiteProfile`
- explicit reason:
  - `needs_authenticated_capture`
  - or `site-profile-upgrade`
- flags for:
  - `requiresAuthenticatedSession`
  - `requiresOperatorApproval`
- required artifact list
- recommended operator steps

The code skeleton for this lives in:

- `services/control-api/src/collection/authenticated-local-browser/index.ts`

This module intentionally plans a request only. It does not yet drive Chrome, CDP, or Playwright directly.

## State Machine

The recommended minimal lifecycle is:

1. `planned`
2. `awaiting-operator`
3. `launching`
4. `connected`
5. `navigating`
6. `capturing`
7. terminal:
   - `captured`
   - `blocked`
   - `failed`

Recommended events:

- `queue`
- `operator-approved`
- `browser-launched`
- `navigation-started`
- `page-loaded`
- `capture-succeeded`
- `policy-blocked`
- `capture-failed`

Important rule:

- this state machine is operator-owned, not autonomous; the transition into live authenticated work must remain explicit and visible

The code skeleton for this lives in:

- `services/control-api/src/collection/authenticated-local-browser/state-machine.ts`

## SiteProfile Layer

The collector should not decide capture behavior from free text alone. Each risky or browser-heavy domain should have a small structured profile with:

- domain aliases
- authentication mode: `none | optional | required`
- interaction mode: `document | feed | app-shell | upload-flow`
- default collection mode:
  - `http-first`
  - `browser-first`
  - `authenticated-local-browser`
- site-specific notes

This is intentionally smaller than a future full plugin or adapter system. The first job is policy stability, not collector maximalism.

The code skeleton for this lives in:

- `services/control-api/src/collection/authenticated-local-browser/site-profiles.ts`

## Minimal File Structure

The minimum internal slice should be:

```text
services/
  control-api/
    src/
      collection/
        authenticated-local-browser/
          index.ts
          site-profiles.ts
          state-machine.ts
  local-browser-bridge/
config/
  site-profiles/
tests/
  integration/
    authenticated-local-browser.test.ts
```

Meaning:

- `control-api/.../authenticated-local-browser/`
  keeps planning and policy code close to the current collection layer
- `services/local-browser-bridge/`
  is reserved for a later CDP or Playwright bridge process so browser control is not jammed into `control-api`
- `config/site-profiles/`
  is reserved for future externalized domain policy once profiles outgrow inline code
- `authenticated-local-browser.test.ts`
  locks the initial interface and transition rules before runtime work begins

## Integration Order

The correct rollout order is:

1. add planning interface and state machine
2. add site-profile matching
3. add a later `local-browser-bridge` process
4. map bridge artifacts back into `SourceCapture` and `EvidenceSet`
5. only then consider persistence or session inventories

This preserves the current platform rule:

- public truth path first
- authenticated browser later

And more specifically:

- `browser-first` public sites should not automatically enter this slice
- this collector only starts when the useful evidence actually needs an authenticated local session

## How This Helps OpenFons Right Now

This slice gives the repo a clear answer to the next set of collection questions without prematurely platformizing:

- it gives `needs_authenticated_capture` a concrete downstream target
- it creates a place to hold CN social and dynamic-site policy
- it avoids turning `capture-runner` into a pile of one-off browser exceptions
- it keeps the future `OpenClaw` or local-operator bridge in a bounded role

## Immediate Next Steps

1. Keep the new planning module out of the main compile happy path for now.
2. Add one later bridge prototype under `services/local-browser-bridge/`.
3. Decide whether the first real target should be `TikTok`, `Douyin`, or `Xiaohongshu`.
4. When the bridge exists, require artifact normalization before any report claim can depend on it.
