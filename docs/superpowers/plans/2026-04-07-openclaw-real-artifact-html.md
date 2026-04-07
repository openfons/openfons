# OpenClaw Real Artifact HTML Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first HTML report that is driven by a real `OpenClaw` artifact batch instead of a hand-written sample case.

**Architecture:** Add a small artifact-batch builder that reads the existing `2026-03-26_redeploy_network_restored` result set, maps it into the current `ReportView` contract, and reuses the existing static report HTML renderer. Keep the current AI procurement export untouched.

**Tech Stack:** TypeScript, Node.js fs/path, Vitest, pnpm

---

## File Map

- Create: `services/control-api/src/report-export/openclaw-artifact-report.ts`
  Read the real artifact batch and build/export a `ReportView`-backed HTML page.
- Create: `scripts/workbench/export-openclaw-real-artifact-report.ts`
  Provide a one-shot export command for the real artifact page.
- Modify: `tests/integration/report-static-export.test.ts`
  Add TDD coverage for the real artifact builder and export script.
- Modify: `package.json`
  Add a package script for the new export command.
- Modify: `docs/workbench/generated/openclaw-real-artifact-report.html`
  Generated output refreshed by the export script.

---

## Task 1: Lock the expected behavior with tests

**Files:**
- Modify: `tests/integration/report-static-export.test.ts`

- [ ] Add a failing test for building a `ReportView` from the real `OpenClaw` batch.
- [ ] Assert the report title, query, and batch statistics are present.
- [ ] Assert at least one success artifact filename and one limitation artifact filename appear in the exported HTML.
- [ ] Add a failing end-to-end script test for the new export command.

## Task 2: Build the artifact-batch report mapper

**Files:**
- Create: `services/control-api/src/report-export/openclaw-artifact-report.ts`

- [ ] Read `labs/collector-compat/results/redeploy-deployment-report-2026-03-26.md`.
- [ ] Read `labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored/meta/summary.json`.
- [ ] Map representative success and limitation files into `SourceCapture`.
- [ ] Map key report conclusions into `EvidenceSet` and `ReportSpec`.
- [ ] Reuse the existing static report HTML renderer to export final HTML.

## Task 3: Wire the export entrypoint

**Files:**
- Create: `scripts/workbench/export-openclaw-real-artifact-report.ts`
- Modify: `package.json`

- [ ] Add a script that writes `docs/workbench/generated/openclaw-real-artifact-report.html`.
- [ ] Add a package.json command so the export can be rerun consistently.

## Task 4: Generate and verify the output

**Files:**
- Modify: `docs/workbench/generated/openclaw-real-artifact-report.html`

- [ ] Run the targeted Vitest suite and confirm the new tests pass.
- [ ] Run the export script to refresh the generated HTML file.
- [ ] Run `pnpm typecheck` to confirm the new export path is typed correctly.

---

## Guardrails

- Do not replace the current AI procurement export path.
- Do not invent new contract types when `ReportView` already fits.
- Do not hide the raw artifact filenames; they are part of the proof that this is real-batch output.
- Do not promote this page as a final SEO page yet; it is the first real artifact-backed report page.
