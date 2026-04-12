# Config Center Operational Closure Design

## Context

OpenFons has already completed two important config-center stages:

- `v010` delivered the read path, `control-api` management surface, and runtime integration.
- `v011` delivered the write-path closure with `dryRun / apply`, revision, repo-local lock, atomic write, backup, and a write runbook.

That means the platform plugin config center is already code-complete in the narrow sense: it can read, validate, resolve, and write repo-visible config safely. What it does **not** yet provide is an operator-quality closure.

There are still four gaps:

1. Structured errors exist, but they are still partly route-local and patch-like instead of one shared operator contract.
2. Operators do not have one diagnostic surface that answers "is project X ready, degraded, or blocked, and why?"
3. Revision and backup data mostly exist on single write responses; post-hoc audit and rollback visibility is still weak.
4. The runbook covers write operations, but there is no explicit acceptance checklist that defines when config-center is truly operable.

`v012` should therefore stay narrow. It should not widen into UI, secret mutation, or more runtime feature work. It should close the operational gap.

## Goals

1. Define one operator-facing error contract for config-center routes.
2. Add a project-level doctor / readiness surface.
3. Add minimal but durable revision / backup observability without introducing a new backend.
4. Turn the existing write-path runbook into a broader operational closure with an explicit acceptance checklist.

## Non-Goals

1. No config-center UI.
2. No secret value write APIs.
3. No external vault, database audit table, or new persistence service.
4. No new plugin categories or driver families.
5. No return to unrelated search / browser / crawler feature expansion.

## Options Considered

### Option A: Docs-only closure

This would only add explanation and acceptance text.

Benefits:

- smallest scope
- fastest finish

Why not:

- it does not change operator behavior
- it cannot solve fragmented errors or missing diagnostics
- it is not enough to claim the config center is now operable

### Option B: Expand into a full admin plane or UI

This would add dashboards or interactive management flows.

Benefits:

- visually appealing
- feels like a bigger product step

Why not:

- it widens scope into permissions, presentation, and UX concerns
- it skips the backend operator contract still missing today
- it is a classic "surface first, foundations later" mistake

### Option C: Narrow operational closure

This adds:

- shared error contract
- project doctor
- revision / backup observability
- acceptance docs

This is the recommended option because it closes the real operational gap without changing the architectural boundaries we just stabilized in `v010` and `v011`.

## Recommended Design

### 1. Shared Operator Error Contract

Today, `control-api` already returns structured `404 / 400 / 409 / 423` responses for many config-center paths, but some mapping still depends on route-local helpers and message-prefix matching. `v012` should promote this into a first-class shared contract.

The new contract should live in `packages/contracts` and cover:

- operator error codes
- operator error body
- resource identification fields
- doctor report shapes
- backup history entry shapes

The new runtime behavior should live in `packages/config-center` and `services/control-api`:

- `packages/config-center` throws typed domain errors
- `services/control-api` maps those typed errors to HTTP responses
- route handlers stop depending on message prefixes for correctness

During the transition, existing read paths that still surface `ENOENT` may be normalized by one shared mapper, but the operator-visible contract must already be identical. The key rule is contract consistency first, internal migration second.

Minimum error codes:

- `not-found`
- `invalid-request`
- `invalid-config`
- `revision-conflict`
- `lock-unavailable`
- `config-write-failed`
- `internal-error`

Minimum response shape:

```json
{
  "error": "revision-conflict",
  "message": "revision conflict for plugin google-default",
  "resource": "plugin-instance",
  "resourceId": "google-default",
  "projectId": "openfons",
  "retryable": true
}
```

Rules:

- the body may identify the resource and whether retry is reasonable
- the body must never leak secret values
- missing-project and missing-binding cases must be consistently mapped across:
  - bindings
  - validate
  - resolve
  - route preflight
  - doctor
  - write routes

### 2. Project Doctor / Readiness Surface

Operators can already call:

- `POST /api/v1/config/validate`
- `POST /api/v1/config/projects/:projectId/validate`
- `POST /api/v1/config/projects/:projectId/resolve`
- `POST /api/v1/config/projects/:projectId/routes/:routeKey/preflight`

But those are still separate low-level probes. `v012` should add one operator-first aggregation route:

- `GET /api/v1/config/projects/:projectId/doctor`

This report should answer, in one read:

- what binding revision is active
- whether project validation is valid / degraded / invalid
- whether each configured route is ready / degraded / blocked
- whether the write path itself looks usable

Minimum doctor fields:

- `projectId`
- `status: ready | degraded | blocked`
- `bindingRevision`
- `validation`
- `routes`
- `writePath`

`writePath` must represent effective usability, not just path existence. In practice that means:

- `configWritable` means the repo config directory is writable
- `lockDirReady` means the lock directory already exists or can be created and written
- `backupDirReady` means the backup directory already exists or can be created and written

Illustrative response:

```json
{
  "projectId": "openfons",
  "status": "blocked",
  "bindingRevision": {
    "etag": "sha256:...",
    "updatedAt": "2026-04-11T19:00:00.000Z"
  },
  "validation": {
    "status": "invalid",
    "errors": [],
    "warnings": [],
    "skipped": [],
    "checkedPluginIds": []
  },
  "routes": [
    {
      "routeKey": "youtube",
      "status": "ready",
      "mode": "public-first",
      "reason": "all required runtime inputs are configured"
    },
    {
      "routeKey": "tiktok",
      "status": "blocked",
      "mode": "requires-auth",
      "reason": "cookie and account secrets are missing"
    }
  ],
  "writePath": {
    "configWritable": true,
    "lockDirReady": true,
    "backupDirReady": true
  }
}
```

Design boundary:

- the doctor route is not a new source of truth
- it aggregates existing config-center validation and existing route-preflight knowledge into one operator summary
- it remains read-only

### 3. Revision / Backup Observability

`v011` already returns:

- `revision`
- `previousRevision`
- `backupFile`

from write operations. The missing part is persistent observability after the request has finished.

`v012` should use a light repo-local design instead of a new backend:

- each successful non-no-op `apply` for both `plugin-instance` and `project-binding` appends one history entry
- the history is stored under `artifacts/config-center-backups/manifest.jsonl`
- each entry records:
  - `resource`
  - `resourceId`
  - `projectId`
  - `createdAt`
  - `revision`
  - `previousRevision`
  - `backupFile`
  - `changed`

Recommended read-only route:

- `GET /api/v1/config/backups`

with filterable query parameters:

- `resource`
- `resourceId`
- `projectId`

Rules:

- `dryRun` must not write history
- no-op apply must not create fake history
- history entries record metadata only, never secret values

This is enough to support:

- post-hoc operator inspection
- runbook-based rollback
- acceptance verification that real apply writes are recoverable

without introducing a database or audit service.

### 4. Runbook And Acceptance Closure

The existing `docs/workbench/config-center-write-path-runbook.md` should remain the main operator write guide. `v012` should extend it instead of replacing it.

It should add:

- doctor query examples
- backup-history query examples
- post-apply verification flow
- rollback verification flow

In addition, `v012` should add one new acceptance doc that defines when config-center is considered operationally complete.

The acceptance matrix should cover at least:

1. missing project returns `404 not-found` across bindings, validate, resolve, preflight, and doctor
2. invalid request body returns `400 invalid-request`
3. invalid config returns `400 invalid-config`
4. stale revision returns `409 revision-conflict`
5. lock contention returns `423 lock-unavailable`
6. doctor can distinguish `ready / degraded / blocked`
7. successful apply writes are visible through backup history
8. rollback followed by re-validation and doctor checks returns the project to the expected state

## Architecture Impact

### `packages/contracts`

Add operator-facing config-center contracts for:

- API errors
- doctor reports
- backup history entries

### `packages/config-center`

Add the reusable operational core for:

- typed domain errors
- project doctor builder
- backup history append / list helpers

This keeps shared config-center behavior in the shared package rather than recreating it inside `control-api`.

### `services/control-api`

Remain the only HTTP management surface, responsible for:

- mapping typed config-center errors to HTTP
- exposing `GET /projects/:projectId/doctor`
- exposing `GET /backups`

### Docs

Keep the current write runbook and extend it. Add one separate acceptance checklist instead of starting a new UI- or dashboard-oriented doc track.

## Acceptance Signals

`v012` is complete only when all of the following are true:

1. the operator error contract is consistent across core config-center routes
2. `project doctor` exposes validation, route readiness, and write-path readiness in one report
3. backup / revision history remains queryable after write requests finish
4. the runbook and acceptance checklist are sufficient to execute one full operator acceptance cycle

## Final Summary

The correct next step after `v011` is not "more features." It is "make the current config center operationally complete."

That means:

- one shared error contract
- one project doctor entry point
- one lightweight backup-history mechanism
- one explicit acceptance closure

This keeps scope narrow, preserves the platform boundaries we just established, and turns the config center from code-complete into operator-ready.
