# OpenFons

OpenFons is an open-source platform for source-native collection, signal watch, opinion analysis, and intelligence workflows.

It is designed around one core idea:

> Turn natural-language or UI-driven research intent into structured plans, execute them deterministically, and preserve evidence for review and delivery.

## Current Status

This repository is the Greenfield bootstrap workspace for the next-generation OpenFons platform.

The current phase focuses on:

- core architecture and planning
- contract and domain-model design
- source-native execution pipeline design
- control-plane and ops-plane bootstrap

## Core Principles

- `Agent compiles, Worker executes`
- `OpenFons v1 的唯一北极星：把真实用户问题稳定编译成可验证的 OpportunitySpec、EvidenceSet 和 ReportSpec，先交付可盈利的网页报告，并为视频、文章与工具/订阅机会保留统一真源。`
- `Topic / TopicRun / SourceCapture / CollectionLog / Evidence / EvidenceSet / Artifact` are first-class objects
- `TaskSpec / WorkflowSpec / ReportSpec` are the stable intermediate contracts
- Skill, Web UI, and API must converge on the same execution model
- LLM browser automation is a controlled fallback, not the default runtime

## Initial Repository Shape

```text
openfons/
  apps/
  services/
  packages/
  config/
  data/
  infra/
  docs/
  tests/
```

## Imported Planning Docs

The first planning set has been copied into [`docs/plan/`](./docs/plan/):

- `独立仓库Greenfield重启与命名方案.md`
- `统一风控对抗平台架构方案.md`
- `plan0/统一风控对抗平台-Phase0实现级设计.md`
- `全平台数据采集与智能分析平台架构方案-v2.md`

## Immediate Next Steps

1. Freeze the v1 `OpportunitySpec` and `ReportSpec` contract shape.
2. Implement the first `TopicRun / Source Captures / Collection Logs -> EvidenceSet` normalization slice.
3. Add derived content compilation after the report truth path is stable.
