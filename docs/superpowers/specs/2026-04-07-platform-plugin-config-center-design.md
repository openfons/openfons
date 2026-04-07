# Platform Plugin Config Center Design

## Context

OpenFons already has:

- a search runtime with provider capability metadata and credential schema files
- a control plane that is starting to model authenticated browser escalation
- multiple real collection tools whose runtime viability depends on `api key / cookie / account / proxy / token`

What it does not have is a single platform-level configuration center that can:

- describe platform-native plugin types in one model
- manage project bindings across search, browser, crawler, account, cookie, and proxy resources
- keep ordinary configuration in the repo while keeping secret values outside the repo
- resolve those inputs into runtime-ready configuration for downstream services

The required design is therefore a platform plugin config center, not a collection of per-service config loaders.

## Design Goals

1. Define a platform-native configuration model for built-in plugin types.
2. Separate repo-visible config from local private secret material.
3. Let `control-api` become the single backend entry point for config listing, validation, masking, and runtime resolution.
4. Support project-level binding and routing so the same plugin instances can be reused across projects.
5. Cover the current high-value runtime domains first:
   - search providers
   - browser runtimes
   - crawler adapters
   - account sources
   - cookie sources
   - proxy sources

## Non-Goals

1. This phase does not implement a UI config page.
2. This phase does not implement fully dynamic plugin categories that can be introduced without code changes.
3. This phase does not store raw secrets in repo-visible config.
4. This phase does not add persistence beyond file-backed config plus local private secret files.
5. This phase does not broaden into report rendering, scheduling, storage backends, or notification channels.

## Recommended Approach

Use a **platform-level plugin config center with built-in plugin categories**.

This means:

- plugin categories are fixed in code for `v1`
- plugin instances are declared in config
- project bindings decide how those instances are actually wired together
- secret values live in a local private directory and are referenced by `SecretRef`

This avoids two failure modes:

1. per-service config drift, where each runtime invents its own loader and masking rules
2. over-abstracted dynamic plugin systems, where `v1` becomes a generic platform shell with weak real integration

## Core Object Model

The config center should expose these first-class objects.

### `PluginType`

Represents a built-in plugin category.

Initial built-in categories:

- `search-provider`
- `browser-runtime`
- `crawler-adapter`
- `account-source`
- `cookie-source`
- `proxy-source`

### `PluginSpec`

Represents the schema and behavioral contract for one built-in plugin category or driver family.

It defines:

- required and optional fields
- which fields are plain config
- which fields are `SecretRef`
- which dependency categories are allowed
- which health checks and validation rules apply

### `PluginInstance`

Represents one concrete configured instance.

Examples:

- `google-default`
- `ddg-default`
- `pinchtab-local`
- `local-browser-default`
- `tiktok-cookie-main`
- `global-proxy-pool`

### `SecretRef`

Represents a reference to local private secret material.

Example shape:

```json
{
  "scheme": "secret",
  "scope": "project",
  "projectId": "openfons",
  "name": "google-api-key"
}
```

Or serialized form:

```text
secret://project/openfons/google-api-key
```

### `ProjectBinding`

Represents how one project uses plugin instances.

It defines:

- which plugin instances are enabled for the project
- which instances play project roles
- which routes apply per platform or collection scope
- what the project-level defaults and overrides are

### `ResolvedRuntimeConfig`

Represents the runtime-safe output of the config center.

It is the only object downstream runtimes should consume.

## Storage Model

### Repo-Visible Config

Repo-visible config should live under:

```text
config/
  plugins/
    types/
    instances/
  projects/
    <projectId>/
      plugins/
        bindings.json
```

Repo-visible config may contain:

- plugin metadata
- plugin instance identity
- plain config
- dependency declarations
- routing and role bindings
- secret references

Repo-visible config must not contain:

- raw API keys
- raw cookies
- raw tokens
- account passwords
- proxy credentials

### Local Private Secret Storage

Local private secret material should live outside the repo:

```text
~/.openfons/
  secrets/
    project/
      openfons/
```

Example files:

```text
~/.openfons/secrets/project/openfons/google-api-key.json
~/.openfons/secrets/project/openfons/pinchtab-token.json
~/.openfons/secrets/project/openfons/tiktok-cookie.txt
~/.openfons/secrets/project/openfons/global-proxy.json
```

The secret store is local-only in `v1`. The config center resolves references to this directory but does not require a database or external vault.

## Built-In Plugin Categories For `v1`

### 1. `search-provider`

Purpose:

- unify search discovery provider configuration for `search-gateway`

Minimum fields:

- `id`
- `type`
- `driver`
- `enabled`
- `config`
- `secrets`
- `policy`
- `healthCheck`

Typical secrets:

- `apiKeyRef`
- `cxRef`
- `secretKeyRef`

### 2. `browser-runtime`

Purpose:

- unify `pinchtab`, local Playwright, and future local browser bridge configuration

Minimum fields:

- `id`
- `type`
- `driver`
- `enabled`
- `config`
- `secrets`
- `dependencies`
- `healthCheck`

Typical config:

- `baseUrl`
- `headless`
- `allowedDomains`
- `profile`

Typical secrets:

- `tokenRef`

### 3. `crawler-adapter`

Purpose:

- unify concrete collection adapters such as `yt-dlp`, `twscrape`, `TikTokApi`, `PRAW`, `MediaCrawler`

Minimum fields:

- `id`
- `type`
- `driver`
- `enabled`
- `scope`
- `config`
- `dependencies`
- `policy`

### 4. `account-source`

Purpose:

- describe account and identity pools used by collection adapters

Minimum fields:

- `id`
- `type`
- `driver`
- `enabled`
- `scope`
- `config`
- `secrets`
- `policy`

### 5. `cookie-source`

Purpose:

- describe cookie or session export sources

Minimum fields:

- `id`
- `type`
- `driver`
- `enabled`
- `scope`
- `config`
- `secrets`
- `policy`

### 6. `proxy-source`

Purpose:

- describe proxy endpoints or proxy pools

Minimum fields:

- `id`
- `type`
- `driver`
- `enabled`
- `config`
- `secrets`
- `policy`

## Project Binding Model

`PluginInstance` describes what exists. `ProjectBinding` describes how a project uses it.

`ProjectBinding` should contain:

1. enabled plugin instance IDs
2. role assignments
3. scope or platform routes
4. project-level overrides

Recommended roles:

- `primarySearch`
- `fallbackSearch`
- `defaultBrowser`
- `authenticatedBrowser`
- `defaultProxy`
- `platformAccount`
- `platformCookie`

Recommended route structure:

```json
{
  "projectId": "openfons",
  "enabledPlugins": [
    "google-default",
    "ddg-default",
    "pinchtab-local",
    "local-browser-default",
    "youtube-adapter",
    "tiktok-adapter",
    "youtube-cookie-main",
    "tiktok-cookie-main",
    "global-proxy-pool"
  ],
  "roles": {
    "primarySearch": "google-default",
    "fallbackSearch": ["ddg-default"],
    "defaultBrowser": "local-browser-default",
    "authenticatedBrowser": "pinchtab-local",
    "defaultProxy": "global-proxy-pool"
  },
  "routes": {
    "youtube": {
      "discovery": ["google-default", "ddg-default"],
      "collection": "youtube-adapter",
      "cookies": ["youtube-cookie-main"],
      "proxy": "global-proxy-pool",
      "mode": "public-first"
    },
    "tiktok": {
      "discovery": ["google-default", "ddg-default"],
      "browser": "pinchtab-local",
      "collection": "tiktok-adapter",
      "accounts": ["tiktok-account-main"],
      "cookies": ["tiktok-cookie-main"],
      "proxy": "global-proxy-pool",
      "mode": "requires-auth"
    }
  }
}
```

The binding model should support:

- project-wide defaults
- platform-specific overrides
- route-specific mode selection such as `public-first` or `requires-auth`

It should not support arbitrary free-form graph wiring in `v1`.

## Validation Model

Validation must return structured status, not only pass or fail.

Recommended statuses:

- `valid`
- `degraded`
- `invalid`

### Validation Areas

1. schema validity
2. secret reference existence
3. dependency closure
4. project binding closure
5. security sanity checks
6. role and route compatibility

### Failure Policies

- `block`
  - required secret missing
  - required dependency missing
  - invalid type or incompatible binding
- `degrade`
  - fallback available
  - config is usable but not ideal
- `warn`
  - risky but non-blocking configuration
- `skip`
  - instance exists but is disabled or unused by the current project

### Structured Error Shape

```json
{
  "status": "invalid",
  "errors": [
    {
      "code": "missing_secret_ref",
      "pluginId": "google-default",
      "field": "apiKeyRef",
      "message": "google-default requires apiKeyRef but the referenced secret was not found"
    }
  ],
  "warnings": []
}
```

## API Surface

The config center should be exposed from `control-api`.

### Metadata APIs

- `GET /api/v1/config/plugin-types`
- `GET /api/v1/config/plugin-types/:typeId`

### Plugin Instance APIs

- `GET /api/v1/config/plugins`
- `GET /api/v1/config/plugins/:pluginId`
- `PUT /api/v1/config/plugins/:pluginId`
- `DELETE /api/v1/config/plugins/:pluginId`

### Project Binding APIs

- `GET /api/v1/config/projects/:projectId/bindings`
- `PUT /api/v1/config/projects/:projectId/bindings`

### Validation APIs

- `POST /api/v1/config/validate`
- `POST /api/v1/config/projects/:projectId/validate`

### Resolution Interfaces

- `POST /api/v1/config/projects/:projectId/resolve`
- `POST /api/v1/config/plugins/:pluginId/resolve`

These resolution paths are backend-internal first, not ordinary frontend-facing APIs.

The preferred `v1` implementation is:

1. internal resolver modules called from backend services
2. optional admin-only HTTP wrappers when needed for debugging or operational inspection

If HTTP wrappers exist, they must return masked summaries, validation outcomes, or ephemeral backend-only resolution handles. They must not return raw secret values to browsers or ordinary API clients.

### Security Rule

Management APIs return only masked views.

They may return:

- whether a secret is configured
- whether a reference resolved
- whether validation passed
- masked summaries

They must not return raw secret values.

Only internal resolver paths may hold raw resolved secrets.

## Runtime Resolution Pipeline

The recommended resolver flow is:

1. load `PluginType`
2. load `PluginInstance`
3. load `ProjectBinding`
4. resolve `SecretRef`
5. validate structure, references, dependencies, and enablement
6. produce `ResolvedRuntimeConfig`
7. return masked management view plus internal runtime view as separate outputs

Downstream systems must consume `ResolvedRuntimeConfig`, not raw files.

This specifically means:

- `search-gateway` should stop assembling provider runtime from `process.env`
- authenticated browser planning should resolve configured runtime instances from the config center
- crawler adapters should resolve cookie, account, proxy, and browser dependencies from the config center

## Recommended Code Layout

### Contracts

Add config-center contracts under:

```text
packages/contracts/src/config-center.ts
```

This layer should define:

- `PluginType`
- `PluginSpec`
- `PluginInstance`
- `SecretRef`
- `ProjectBinding`
- `ConfigValidationResult`
- `ResolvedRuntimeConfig`

### Control API Modules

Add config center backend modules under:

```text
services/control-api/src/config-center/
  schemas.ts
  loader.ts
  secret-store.ts
  validator.ts
  resolver.ts
  app.ts
```

Responsibilities:

- `schemas.ts`
  - internal validation schemas
- `loader.ts`
  - read repo-visible config files
- `secret-store.ts`
  - resolve local private secrets and build masked views
- `validator.ts`
  - perform structured validation and produce `valid / degraded / invalid`
- `resolver.ts`
  - generate runtime-ready resolved config
- `app.ts`
  - expose config center routes

### Explicit Anti-Patterns

Do not:

1. keep independent env-based config assembly inside each runtime service
2. let each downstream runtime invent its own secret handling and masking
3. collapse file loading, validation, resolution, and route handling into one large module

## Testing Strategy

Tests should prove that the config center can drive real project chains, not only parse schemas.

### 1. Contract Tests

Cover:

- `PluginType`
- `PluginSpec`
- `PluginInstance`
- `SecretRef`
- `ProjectBinding`
- `ConfigValidationResult`
- `ResolvedRuntimeConfig`

### 2. Loader And Secret Store Tests

Cover:

- file loading
- secret resolution
- missing secret behavior
- masked management views

### 3. Resolver And Validator Integration Tests

Cover at least:

- `google + ddg` provider resolution
- `pinchtab-local + tokenRef + allowedDomains`
- `tiktok-adapter + cookie-source + proxy-source`
- invalid dependency closure
- degraded fallback selection

### 4. Runtime Bridge Tests

Cover:

- `search-gateway` using resolved provider config instead of direct env assembly
- authenticated browser slice resolving project-configured browser instances
- crawler adapters resolving resource dependencies from project bindings

## Phased Delivery Order

Although the design is platform-level, implementation should still follow a controlled sequence.

### Phase 1

Add:

- contracts
- loader
- secret store
- validator
- resolver

### Phase 2

Add:

- project binding support
- config center API routes in `control-api`

### Phase 3

Integrate the first real consumers:

- `search-gateway`
- `browser-runtime` selection for authenticated collection paths

### Phase 4

Integrate crawler adapters:

- `yt-dlp`
- `twscrape`
- `TikTokApi`
- `PRAW`
- `MediaCrawler`
- later adapters of the same family

## Acceptance Signals For `v1`

`v1` should be considered complete only when all of the following are true:

1. plugin types, plugin instances, and project bindings can be declared in repo config
2. local private secret files can be resolved through `SecretRef`
3. `control-api` exposes masked management views plus structured validation results
4. at least one search chain and one browser or authenticated chain consume resolved config from the config center

## Final Summary

The platform plugin config center is a unified control layer for OpenFons built-in runtime plugins.

Its key rules are:

- built-in plugin categories, not fully dynamic plugin kinds
- repo-visible config for ordinary fields and references
- local private files for real secrets
- project bindings for actual route wiring
- `control-api` as the single validation and resolution backend
- downstream runtimes consuming resolved config instead of inventing their own config logic

This gives OpenFons one coherent way to manage search, browser, crawler, account, cookie, and proxy configuration without leaking secrets into the repo or fragmenting runtime behavior across services.
