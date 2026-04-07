# OpenClaw Real Artifact HTML Design

## Context

OpenFons 现在同时有两类东西：

1. 已经落盘的真实采集产物批次，主要在 `labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored`
2. 已经可导出的样板报告页，主要是 `direct-api-vs-openrouter.html`

当前缺口不是“再做一个样板页”，而是把真实产物批次直接接进 HTML 导出链路，证明 OpenFons 可以从真实采集走到真实页面。

## Goals

1. 为 `OpenClaw` 的真实批次生成第一版公开可读 HTML。
2. 页面必须直接体现真实批次信息，而不是只显示抽象结论。
3. 复用现有 `ReportView -> static html` 的报告合同，避免新增一套平行模型。
4. 保持实现最小，可继续往正式 SEO 页演进。

## Non-Goals

1. 本轮不重做 `report-web`。
2. 本轮不发起新采集任务。
3. 本轮不做通用主题工厂。
4. 本轮不把页面做成最终视觉版 SEO 页面。

## Recommended Approach

推荐做法是新增一条“真实批次构建器”：

- 输入：`labs/collector-compat/results/artifacts/2026-03-26_redeploy_network_restored` 及其配套 Markdown 报告
- 输出：符合现有 `ReportView` 结构的数据
- 最终复用当前 `static-html.ts` 导出 HTML

这样可以保持：

- 一个页面渲染器
- 两种数据来源
  - AI procurement 样板 case
  - OpenClaw 真实 artifacts 批次

## Page Shape

首版页面需要至少包含这些信息：

1. 标题、查询词、批次日期、总文件数
2. 一句话结论和 3 条核心判断
3. 真实成功产物清单
4. 真实限制证据清单
5. 关键原始文件入口，例如截图、HTML、JSON、TXT
6. 批次边界与风险说明

页面可以沿用当前 report export 样式，但内容必须明显是“真实批次页”，不是案例文档页。

## Data Mapping

建议映射如下：

- Markdown 报告标题与结论 -> `report.title` / `report.summary` / `report.thesis`
- Markdown 中的关键观察 -> `report.claims`
- 成功与限制文件 -> `sourceCaptures`
- 关键批次判断 -> `evidenceSet.items`
- 查询词、批次时间、文件统计、环境信息 -> `report.sections`
- 批次限制与下一步建议 -> `report.evidenceBoundaries` / `report.risks`

原始文件链接必须保留到页面里，便于人工回看。

## Testing Strategy

新增测试覆盖：

1. 真实批次构建器能生成合法 `ReportView`
2. 导出的 HTML 包含真实查询词与批次数量
3. 导出的 HTML 包含至少一个成功产物文件名和一个限制产物文件名
4. 导出脚本可端到端生成文件

## Acceptance Signals

完成标志：

1. `docs/workbench/generated/openclaw-real-artifact-report.html` 存在
2. 页面中能看到 `2026-03-26` 批次真实信息
3. 页面中能点到真实产物文件
4. 测试和 typecheck 通过

## Final Summary

这次不是“再做一个案例页”，而是把真实采集批次接入现有报告导出体系。最小但正确的实现是：新增批次构建器，继续复用现有 HTML 渲染器。
