# 从 papaweb 迁移到 openfons 的资产清单

> 日期：2026-03-24
> 目标：明确 `papaweb` 中哪些资产应迁入 `openfons`，哪些只可参考，哪些禁止直接平移
> 适用范围：
> - 当前 `D:\demo1\papaweb`
> - 当前 `D:\demo1\openfons`

---

## 1. 结论

迁移原则不是“整仓复制”，而是：

- 迁移已经验证过的架构约束与最小可用骨架
- 迁移可复用的确定性能力与测试护栏
- 保留 `papaweb` 作为 legacy 参考仓
- 禁止把 legacy 历史包袱、上游镜像、运行日志和过渡治理整包带入 `openfons`

一句话：

> `openfons` 应继承 `papaweb` 的有效能力，不继承它的历史负担。

---

## 2. 归类标准

### 必须迁

满足任一条件即归入此类：

- 已经是 `openfons` 新架构的核心契约
- 已经形成最小可运行或最小可验证骨架
- 对新仓库的启动、测试、规划不可缺少

### 可选迁

满足以下特征之一：

- 有参考价值，但当前仍未形成正式主线实现
- 语义可借鉴，但需要重写或拆解后再迁
- 适合作为 archive / reference，而不是直接进入主运行时

### 禁止直接迁

满足以下特征之一：

- 上游镜像、外部资产、第三方整仓代码
- 运行时生成物、日志、缓存、环境文件
- 与 legacy 分支治理、过渡状态、旧真源语义强绑定

---

## 3. 必须迁

| 资产 | 当前路径 | 迁移建议 | 原因 |
| --- | --- | --- | --- |
| 新仓重启主方案 | `docs/plan/独立仓库Greenfield重启与命名方案.md` | 迁入 `openfons/docs/plan/` | 已经明确 `openfons` 命名、组织、主仓、分支与目录策略 |
| 总架构主文档 | `Memory/planx/统一风控对抗平台架构方案.md` | 迁入 `openfons/docs/plan/` | 定义四大平面、真源、执行边界，是长期架构基线 |
| Phase 0 主文档 | `Memory/planx/统一风控对抗平台-Phase0实现级设计.md` | 迁入 `openfons/docs/plan/plan0/` | 规定何为正式运行时、何为资产区、何为上游镜像 |
| Greenfield 目标态文档 | `Memory/planx/全平台数据采集与智能分析平台架构方案-v2.md` | 迁入 `openfons/docs/plan/` | 定义 Skill、控制面、交付面、Evidence 模型等目标态 |
| 核心契约包 | `packages/contracts/**` | 原样迁入 `openfons/packages/contracts/` | 已有 `TaskSpec / WorkflowSpec / ReportSpec` 契约骨架和测试 |
| 领域模型包 | `packages/domain-models/**` | 原样迁入 `openfons/packages/domain-models/` | 已有 `Topic / TopicRun / Evidence / EvidenceSet / Artifact` 模型骨架和测试 |
| 共享布局骨架 | `packages/shared/src/index.mjs` 与 `packages/shared/tests/index.test.mjs` | 选择性迁入 `openfons/packages/shared/` | 已固化新仓目录布局与基本测试护栏 |
| 测试入口脚本 | `scripts/greenfield-test-entry.mjs` | 迁入 `openfons/scripts/` | 当前最小测试编排器，能直接支撑 bootstrap 验证 |
| Bootstrap 测试 | `tests/contract/**` `tests/integration/**` `tests/e2e/**` | 迁入 `openfons/tests/` | 这些测试是新仓最早可用的质量护栏 |
| 根级工作区清单 | `package.json` 中的 workspaces 与 `test:gf:*` 脚本 | 作为模板迁入，不建议原样照抄全部字段 | 已经体现 monorepo 和测试入口的最小结构 |

### 必须迁的执行方式

- 文档类：可直接复制
- `contracts / domain-models / shared / tests / scripts`：建议优先原样迁入，再在 `openfons` 内继续演化
- `package.json`：只迁移工作区、脚本、Node 版本约束，不继承旧仓多余描述

---

## 4. 可选迁

| 资产 | 当前路径 | 建议角色 | 为什么不是“必须迁” |
| --- | --- | --- | --- |
| 平台升级方案整套文档 | `docs/plan/平台升级方案/**` | `openfons/docs/plan/archive/` 或 `reference/` | 对控制面、任务中心、前端后台有参考价值，但其重心仍偏 `papaweb` 平台升级 |
| 同仓库 Greenfield 方案 | `docs/plan/同仓库Greenfield重启实施方案.md` | `archive/reference` | 可作为“为什么放弃同仓库”的历史依据，不再是执行主线 |
| 方案映射说明 | `docs/plan/统一风控方案与当前平台升级方案映射说明.md` | `archive/reference` | 适合保留为架构演进说明，不适合作为新仓启动主文档 |
| `Memory/planx` 中的 v1 方案 | `Memory/planx/全平台数据采集与智能分析平台架构方案.md` | 已迁入 `docs/plan/archive/` | 有演进参考价值，但已被 v2 替代 |
| 对话解读稿 | `Memory/planx/doubao_*.txt` | 已迁入 `docs/context/archive/` | 属于上下文材料，不应与正式架构文档并列 |
| Git hooks 安装脚本 | `scripts/install-git-hooks.ps1` | 可迁入 `openfons/scripts/` | 有实用价值，但需按 `openfons` 的分支模型重写 |
| `packages/policy-engine` | `packages/policy-engine/**` | 参考并重写 | 当前仅有 README，占位价值大于代码价值 |
| `packages/adapters` | `packages/adapters/**` | 参考并重写 | 当前仍是占位 |
| `packages/sdk-observability` | `packages/sdk-observability/**` | 参考并重写 | 当前仍是占位 |
| `apps/control-web` | `apps/control-web/**` | 仅保留路径语义 | 当前只有 README，不是可运行前端 |
| `apps/ops-web` | `apps/ops-web/**` | 仅保留路径语义 | 当前只有 README，不是可运行前端 |
| `services/control-api` | `services/control-api/**` | 仅保留路径语义 | 当前只有 README |
| `services/source-registry` | `services/source-registry/**` | 仅保留路径语义 | 当前只有 README |
| `services/report-api` | `services/report-api/**` | 仅保留路径语义 | 当前只有 README |
| `services/visualization-api` | `services/visualization-api/**` | 仅保留路径语义 | 当前只有 README |
| `services/publish-evidence` | `services/publish-evidence/**` | 仅保留路径语义 | 当前只有 README |
| `services/query-api` | `services/query-api/**` | 仅保留路径语义 | 当前只有 README，现阶段无可复用实现 |
| `services/worker-seed` | `services/worker-seed/**` | 仅保留路径语义 | 当前只有 README |
| `services/worker-discovery` | `services/worker-discovery/**` | 参考并重写 | 当前目录本身是 README，占位；真正 discovery 逻辑在旧仓历史/共享逻辑中需要单独提炼 |
| `services/worker-fetch-http` | `services/worker-fetch-http/**` | 参考并重写 | 当前目录本身是 README，占位；可复用的是旧链路思想和通道抽象 |
| `services/worker-normalize` | `services/worker-normalize/**` | 参考并重写 | 当前目录本身是 README，占位 |
| `services/worker-quality` | `services/worker-quality/**` | 参考并重写 | 当前目录本身是 README，占位 |
| `services/orchestrator-airflow/README.md` 与 `dags/` 设计思路 | `services/orchestrator-airflow/**` | 仅抽取设计，不直接迁库 | 该目录含大量上游内容，需要拆净后再决定 |
| `apps/crawler` | `apps/crawler/**` | 作为 legacy 采集素材与 Evidence 前身参考 | 体量很大且语义偏旧，不应整体进入新主运行时 |
| `infra/docker/README.md` | `infra/docker/README.md` | 参考并重写 | 可借鉴部署说明，但不能把旧运行数据与环境配置带过来 |

### 可选迁的执行方式

- 文档：迁到 `archive/` 或 `reference/`
- 占位目录：只保留目标目录名，不复制 README 作为“伪实现”
- 老工具区：只按模块抽取可复用逻辑，不整目录复制

---

## 5. 禁止直接迁

| 资产 | 当前路径 | 禁止原因 |
| --- | --- | --- |
| 上游 Crawlab 镜像 | `services/gateway-crawlab/upstream-crawlab/**` | 纯上游镜像，不是 OpenFons 一方代码 |
| Airflow 上游整仓 | `services/orchestrator-airflow/upstream-airflow/**` 及大量上游文件 | 第三方整仓代码，不能当作新主仓自有实现 |
| Temporal 上游资产 | `services/orchestrator-temporal/**` | 属于外部依赖或镜像，不应直接平移 |
| 浏览器抓取上游镜像 | `services/worker-fetch-browser/**` | 当前主要是上游镜像与参考资产，不是新主运行时代码 |
| Web Console 上游资产 | `services/web-console/**` | 当前是上游 UI 资产，不应直接进入新主仓 |
| 社交平台上游适配器整仓 | `services/social-adapters/**` | 体量巨大且含第三方语义，必须拆解后再决定 |
| `infra/docker/data/**` | `infra/docker/data/**` | 运行日志、状态数据、缓存，不应迁入新仓 |
| `.env` 和旧环境文件 | `infra/docker/.env` 等 | 含环境配置与潜在敏感信息，不应直接复制 |
| `node_modules/**` | `node_modules/**` | 构建产物，不应纳入新仓 |
| `tmp_plan0_upstreams/**` | `tmp_plan0_upstreams/**` | 临时整理区，纯历史过程资产 |
| MemoryTree 运行态文件 | `Memory/01_goals/**` `Memory/02_todos/**` `Memory/03_chat_logs/**` `Memory/06_transcripts/**` | 属于旧仓运行记忆，不是新仓产品文档 |
| 旧仓 `AGENTS.md` 原文 | `AGENTS.md` | 绑定 `papaweb`、legacy 与 `greenfield/*` 规则，且当前存在编码异常显示问题 |
| 旧仓分支治理说明原样照搬 | 所有只服务于 `greenfield/*` 过渡治理的文本 | `openfons` 是新主仓，应使用标准 `main/dev` 语义重新书写 |
| `gold_tool_entities` 相关旧真源语义 | 旧代码与旧文档中的兼容真源逻辑 | 这是旧平台兼容层语义，不能进入新平台核心模型 |

---

## 6. 推荐迁移顺序

### T1：先迁“文档与契约”

先做：

- `docs/plan/` 核心文档
- `packages/contracts`
- `packages/domain-models`
- `packages/shared`
- `scripts/greenfield-test-entry.mjs`
- `tests/**`

这是最小、最干净、最不容易出错的一批。

### T2：再迁“测试护栏与工作区骨架”

再做：

- `package.json` 的 workspace 与 test 脚本
- 基础目录骨架
- `docs/adr` 与 `docs/runbooks`

### T3：最后才抽取 legacy 能力

最后再做：

- 从 `apps/crawler` 抽取真正可复用的采集能力
- 从旧执行链提炼 discovery / fetch / normalize / quality 的新实现
- 重新设计而不是复制控制面与源注册中心

---

## 7. 对 `papaweb` 的最终定位

迁移完成后，`papaweb` 仍然需要保留，但角色应固定为：

- legacy 参考仓
- 迁移素材仓
- 回归对照仓
- 历史文档与旧闭环留档仓

它不再承担：

- 新功能主线
- 新品牌主仓
- OpenFons 正式发布主线

---

## 8. 最终执行建议

如果以“今天就能开始干”为目标，最推荐的动作是：

1. 先把“必须迁”中的代码骨架和测试全部迁到 `openfons`
2. 在 `openfons` 中跑通第一轮 bootstrap tests
3. 再按功能价值，从 `papaweb` 中拆能力，而不是搬目录

这会比“大规模复制后再清理”稳定得多。
