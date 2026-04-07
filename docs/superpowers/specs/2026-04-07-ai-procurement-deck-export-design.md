# AI Procurement Deck Export Design

## Context

OpenFons now has:

- a fixed HTML workbench report export for `direct-api-vs-openrouter`
- a reusable report compilation path that yields `ReportView`
- a downloaded reference repository at `tmp/frontend-slides`

That reference repo is useful, but it is **not** a React app, component library, or report renderer. It is a zero-dependency HTML slide generator skill.

The right reuse strategy is therefore:

- keep the existing report page and report HTML export
- add a separate presentation-style HTML export for demos, walkthroughs, and investor or team briefings
- borrow the reference repo's output philosophy and presentation mechanics, not its plugin packaging model

## Design Goals

1. Generate a separate, fixed HTML deck for the AI procurement case.
2. Reuse existing OpenFons report data rather than hand-writing duplicate content.
3. Keep the deck zero-dependency at runtime: one HTML file with inline CSS and JS.
4. Make the deck visibly different from the report page so each artifact has a clear role.
5. Preserve evidence-backed discipline even in presentation form.

## Non-Goals

1. This phase does not replace `report-web`.
2. This phase does not import the external repo as a runtime dependency.
3. This phase does not build a general-purpose slide platform for every OpenFons case.
4. This phase does not add PPT import, PDF export, or live deployment flows yet.
5. This phase does not turn the deck into the primary source of truth for report content.

## Recommended Approach

Add a second export path for the current AI procurement case:

- existing artifact:
  - `docs/workbench/generated/direct-api-vs-openrouter.html`
- new artifact:
  - `docs/workbench/generated/direct-api-vs-openrouter-deck.html`

The new deck should be built from the same `ReportView` source used by the report export, but rendered into a slide-based HTML presentation.

This keeps:

- one content source
- two delivery surfaces
- no drift between report claims and deck claims

## What To Reuse From `frontend-slides`

Reuse these ideas:

1. single-file HTML output with inline CSS and JS
2. clear visual preset direction instead of generic styling
3. viewport-fitted slide structure
4. keyboard and click navigation
5. strong presentation framing with title, summary, sections, and closing slide

Do **not** reuse these parts directly:

1. Claude skill packaging
2. plugin metadata and marketplace structure
3. PPT conversion flow
4. direct copy-paste of the full template as if OpenFons were a slide generator product

## Artifact Shape

The deck should contain a bounded number of slides. Recommended first version:

1. Title slide
   - title
   - audience
   - geo
   - summary
2. Thesis slide
   - one clear answer
   - one supporting framing paragraph
3. Claims slide
   - top 3 claims from the report
4. Sources slide
   - official sources first
   - community corroboration clearly caveated
5. Evidence boundaries and risks slide
   - what the case proves
   - what it does not prove
6. Closing slide
   - update timestamp
   - OpenFons attribution

If content does not fit the viewport cleanly, split into additional slides. No scrolling inside slides.

## Rendering Strategy

Add a new deck exporter under:

```text
services/control-api/src/report-export/
  static-html.ts
  static-deck.ts
```

Responsibilities:

- `static-html.ts`
  - current report-style export
- `static-deck.ts`
  - slide-style export built from the same report view data

Add a new script:

```text
scripts/workbench/export-direct-api-vs-openrouter-deck.ts
```

Add a new package script:

```text
export:workbench:direct-api-vs-openrouter-deck
```

## Visual Direction

The deck should not look like the current report page.

Recommended visual direction for `v1`:

- dark editorial presentation surface
- warm accent color for evidence and callouts
- strong title typography
- restrained motion
- no purple-on-white generic AI style

This is presentation UI, not document UI.

## Data Mapping Rules

The deck must map directly from `ReportView`.

Required mappings:

- `report.title` -> title slide
- `report.summary` -> title or framing slide
- `report.thesis` -> thesis slide
- `report.claims` -> claims slide(s)
- `report.sourceIndex` -> sources slide(s)
- `report.evidenceBoundaries` -> boundaries section
- `report.risks` -> risks section
- `report.updatedAt` and `report.updateLog` -> closing or update slide

The deck may compress wording for presentation readability, but it must not invent claims that are not supported by the source report.

## Testing Strategy

Add integration coverage for:

1. deck exporter returns valid HTML
2. generated deck file is written to the expected path
3. deck includes:
   - title
   - thesis
   - at least one claim
   - at least one official source
   - evidence boundaries
4. export script runs end-to-end

The existing report export tests remain separate and must continue to pass.

## Acceptance Signals

This deck export is complete when:

1. `docs/workbench/generated/direct-api-vs-openrouter-deck.html` exists
2. it opens as a standalone HTML presentation
3. it is visibly presentation-style rather than report-style
4. it is sourced from the current OpenFons report data
5. tests cover the export path and pass

## Final Summary

OpenFons should reuse `frontend-slides` as a **presentation-output reference**, not as a direct runtime dependency.

The concrete `v1` outcome is a second generated artifact:

- report page HTML for detailed reading
- slide deck HTML for demo and briefing use

Both should come from the same underlying AI procurement `ReportView`, so the product gains a second delivery surface without forking the truth model.
