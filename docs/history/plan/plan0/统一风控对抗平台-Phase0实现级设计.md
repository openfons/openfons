# 统一风控对抗平台 Phase 0 实现级设计

> 对应 [统一风控对抗平台总架构书](../统一风控对抗平台架构方案.md) 中的 `Phase 0：冻结现状与拆分资产区`

## 1. 文档目的

这份文档不是未来最终架构，也不是 Phase 1 数据模型设计。

它只负责回答 4 个问题：

1. Phase 0 到底做什么，不做什么
2. 当前仓库里哪些算正式运行时，哪些只是上游镜像、资产区、占位目录
3. 当前阶段必须冻结哪些“真源”
4. 应该先补哪些测试、按什么顺序拆 PR

Phase 0 的本质不是“增加新能力”，而是先把地基修平：

- 冻结现状
- 拆开运行时与资产区
- 补齐最关键的测试基线
- 给 Phase 1 的 `Topic / TopicRun / Evidence / Artifact` 重建腾出干净边界

## 2. Phase 0 目标

Phase 0 必须达成以下结果：

- 团队对“当前正式主链路”形成单一共识，不再把上游镜像误认成运行时
- 团队能明确区分“平台主链路运行时”和“迁移期采集工具”，不再把 `apps/crawler` 误认成正式平台主运行时
- 仓库目录结构能明确区分：
  - 正式运行时代码
  - 上游镜像/参考资产
  - placeholder/待建设目录
- 当前主链路的关键真源被明确冻结，不再边做边改口径
- `worker-discovery` 被纳入正式测试体系，而不是只靠共享库测试间接覆盖
- 为 Phase 1 重建核心数据模型创造条件，但 Phase 0 本身不提前引入新真源

## 3. Phase 0 非目标

Phase 0 明确不做下面这些事：

- 不新建真正的 `Topic / TopicRun / Evidence / EvidenceSet / Artifact` 表结构
- 不引入真正的多租户、ACL、组织隔离
- 不建设报告中心、PDF 渲染链、情报门户
- 不在本阶段引入正式 `source-registry` 独立服务
- 不在本阶段落地浏览器执行网关、媒体采集网关
- 不把 `gold_tool_entities` 改造成未来真源
- 不把 `apps/crawler/collect.mjs` 这一类迁移期脚本重新抬升为平台主链路

换句话说，Phase 0 不是“新平台上线”，而是“把现有仓库整理成可继续重建的平台基线”。

## 4. 当前仓库分类基线

### 4.1 当前正式运行时

Phase 0 认定以下目录属于当前真实运行时：

- `services/query-api`
- `services/worker-seed`
- `services/worker-discovery`
- `services/worker-fetch-http`
- `services/worker-normalize`
- `services/worker-quality`
- `services/publish_worker`
- `packages/contracts`
- `packages/policy-engine`
- `packages/schema`
- `packages/shared`
- `infra/docker`
- `scripts/`

这部分才是当前主链路：

```text
query-api
  -> worker-discovery（当 sourceSites 配置存在时）
  -> worker-fetch-http
  -> worker-normalize
  -> worker-quality
  -> publish_worker
```

### 4.2 当前迁移期工具与证据前身区

- `apps/crawler`

这里要明确降级定位：

- 它仍然有价值
- 但它不是当前平台主链路运行时
- 它更像迁移期 CLI 采集工具、回填/验证工具、以及 `Evidence` 的前身产出区

当前这样判断的依据也很直接：

- 总架构书定义的当前真实主链路并不经过 `apps/crawler`
- `apps/crawler` 自身 README 仍以 `collect.mjs / run-via-crawlab.mjs` 为主入口
- 它输出的是 `tool_candidates_raw.jsonl`、raw html、review 文件，更接近迁移期证据前身区

因此，Phase 0 对 `apps/crawler` 的正确态度不是“删除”，而是“保留、冻结、但不再误认成主运行时”。

### 4.3 当前一方代码但不是主运行时核心

- `services/orchestrator-airflow/README.md`
- `services/orchestrator-airflow/dags/`

这里有一小部分一方代码，但目前只是围绕现有 `query-api` 的编排包装层，不应被误写成独立平台控制面。

### 4.4 当前 placeholder

以下目录当前不是正式产品实现，只是占位：

- `apps/api`
- `apps/web`

它们不能在任何架构文档、README、目录说明中继续被描述为“现成前后端”。

### 4.5 当前上游镜像 / 参考资产

以下目录当前本质上是上游镜像、参考代码或外部资产，不是 papaweb 一方运行时代码：

- `services/gateway-crawlab/upstream-crawlab`
- `services/orchestrator-airflow/upstream-airflow`
- `services/orchestrator-temporal/upstream-temporal`
- `services/worker-fetch-browser/upstream-pinchtab`
- `services/worker-fetch-browser/upstream-playwright`
- `services/web-console/upstream-tanstack-table`
- `services/social-adapters/upstream-mediacrawler`

这些目录继续放在 `services/` 下面，会持续制造两个问题：

1. 团队误以为它们已经是正式服务
2. 文档、测试、依赖、CI 都会围绕错误对象展开

### 4.6 当前临时区

- `tmp_plan0_upstreams`

该目录应视为临时资产整理区，不应长期作为主仓库正式结构的一部分。

## 5. Phase 0 核心架构判断

### 5.1 先冻结现状，不先发明新层

Phase 0 的第一原则是：先把今天到底怎么跑写死，再谈明天怎么重建。

因此本阶段必须接受以下现实：

- 当前任务入口真正在 `query-api`
- 当前 `source-sites.v1.json + worker-discovery` 已经共同承担了源站发现链路
- 当前运行状态仍围绕 `crawl_jobs / crawl_tasks / quality_scores / source_run_state`
- 当前对外结果查询仍围绕 `gold_tool_entities`

### 5.2 Source Registry 在 Phase 0 只冻结，不独立实现

Phase 0 不新建一个全新的 `source-registry` 服务。

本阶段只做两件事：

- 冻结 `apps/crawler/config/source-sites.v1.json` 的 authoring 语义
- 冻结 `packages/shared + worker-discovery` 对该语义的运行时解释

也就是先承认当前“proto source-registry”的存在，再为 Phase 1/2 的正式收编做准备。

### 5.3 `gold_tool_entities` 在 Phase 0 被正式降级

从本阶段起，`gold_tool_entities` 只能被定义为：

- 最新结果视图
- 兼容导出视图
- 旧链路查询视图

不能再被写成：

- 最终证据真源
- 报告冻结真源
- 长期 watch 真源

### 5.4 目录语义必须先于代码重构

如果目录本身已经把团队带偏，那么先加功能只会把错结构放大。

所以 Phase 0 的顺序必须是：

1. 明确什么是运行时
2. 把假运行时移出正式路径
3. 给保留下来的真运行时补测试
4. 再进入下一阶段的数据模型重建

## 6. Phase 0 真源冻结

| 领域 | Phase 0 真源 | 说明 |
| --- | --- | --- |
| 任务触发 | `services/query-api/src/index.mjs` 的 `/api/v1/pipeline/seed-run` | 当前唯一正式入口 |
| 源站 authoring 配置 | `apps/crawler/config/source-sites.v1.json` | 当前作者态真源，不迁移路径 |
| 源站运行态投影 | PostgreSQL `source_sites` 表 | 只作为运行时投影，不是 authoring 真源 |
| 发现逻辑 | `packages/shared/src/discovery.mjs` + `services/worker-discovery/src/index.mjs` | 冻结 discovery 解释口径 |
| 运行状态 | `crawl_jobs / crawl_tasks / quality_scores / source_run_state` | 当前主链路状态真源 |
| 对外兼容结果 | `gold_tool_entities` | 仅兼容/最新结果视图 |
| 原始候选证据前身 | `apps/crawler` 产出的 raw 文件和 `tool_candidates_raw.jsonl` | 只承认其为 Evidence 前身，不升级为正式模型 |

补充约束：

- `source_sites` 表不是新的源站真源，它只是 `source-sites.v1.json` 被运行时吸收后的物化结果
- `gold_tool_entities` 不允许再承接任何未来 `Artifact Store` 语义
- Phase 0 不新增第二套 authoring 配置，也不允许“双轨配置”并行

## 7. Phase 0 完成后的目标目录形态

```text
papaweb/
  apps/
    crawler/                    # 迁移期工具与证据前身区，不算正式平台运行时
    api/                        # placeholder，明确不算正式运行时
    web/                        # placeholder，明确不算正式运行时
  services/
    query-api/
    worker-seed/
    worker-discovery/
    worker-fetch-http/
    worker-normalize/
    worker-quality/
    publish_worker/
    orchestrator-airflow/
      dags/
      README.md
  packages/
    contracts/
    policy-engine/
    schema/
    shared/
  upstreams/
    crawlab/
    airflow/
    temporal/
    browser/
      pinchtab/
      playwright/
    ui/
      tanstack-table/
    social/
      mediacrawler/
  labs/
    tmp_plan0_upstreams/
```

说明：

- `services/worker-fetch-browser` 当前若只有上游镜像，应整体退出 `services/`
- `services/web-console` 当前若只有上游镜像，应整体退出 `services/`
- `services/gateway-crawlab` 当前若只有上游镜像，应整体退出 `services/`
- `services/orchestrator-temporal` 当前若只有上游镜像，应整体退出 `services/`
- `services/social-adapters` 当前若只有上游镜像，应整体退出 `services/`
- 未来若要重建这些服务，应以新的 papaweb 一方代码重新创建，而不是沿用镜像目录

## 8. Phase 0 代码改造要求

### 8.1 必须保留不动的路径

以下路径在 Phase 0 不做迁移：

- `apps/crawler/config/source-sites.v1.json`
- `apps/crawler/src/collect.mjs`
- `packages/shared/src/index.mjs` 中对默认 source config 路径的依赖

原因很简单：本阶段的重点是清目录和补测试，不是引入无必要的路径级震荡。

### 8.2 必须搬出的目录

以下目录必须迁出正式运行时路径：

- `services/gateway-crawlab/upstream-crawlab -> upstreams/crawlab/`
- `services/orchestrator-airflow/upstream-airflow -> upstreams/airflow/`
- `services/orchestrator-temporal/upstream-temporal -> upstreams/temporal/`
- `services/worker-fetch-browser/upstream-pinchtab -> upstreams/browser/pinchtab/`
- `services/worker-fetch-browser/upstream-playwright -> upstreams/browser/playwright/`
- `services/web-console/upstream-tanstack-table -> upstreams/ui/tanstack-table/`
- `services/social-adapters/upstream-mediacrawler -> upstreams/social/mediacrawler/`
- `tmp_plan0_upstreams -> labs/tmp_plan0_upstreams/`

### 8.3 必须重新标注的目录

- `apps/api`
  必须明确标为 placeholder，不再写“API Service”式运行时暗示
- `apps/web`
  必须明确标为 placeholder，不再写“Web App”式产品暗示
- `services/orchestrator-airflow`
  必须明确说明运行时仅包括 `dags/` 和一方说明文件，不包括上游 Airflow 源码镜像

### 8.4 必须补的测试

Phase 0 的测试策略不是“从零重新发明一套 discovery 测试”，而是承认并复用现有覆盖，再把缺口补齐。

当前已经存在两类有价值的覆盖：

- `packages/shared/tests/discovery.test.mjs`
  已冻结 discovery 语义与部分配置解释口径
- `services/worker-seed/tests/index.test.mjs`
  已冻结 source-site plan 会走 discovery batch 的路由语义

因此，Phase 0 至少要补下列测试，而不是只做目录搬迁，也不是重复建设现有测试：

1. `services/worker-discovery` 单元测试
   覆盖 `processMessage` 的核心分支：
   - stale run 跳过
   - source site 加载失败
   - `discoverSourceCandidates` 返回候选后入队
   - job 状态从 `discovering` 到 `queued/completed`

2. `services/worker-discovery/package.json`
   必须增加 `test` 脚本

3. 根 `package.json`
   必须把 `@papaweb/worker-discovery` 纳入 `npm run test:unit`

4. `query-api` 路由测试补缺口
   在现有 `services/query-api/tests/http.test.mjs` 基础上新增 case，明确冻结 `/api/v1/pipeline/seed-run` 在存在 `sourceSites` 时走 discovery batch 的语义

5. `packages/shared` 配置与发现测试补缺口
   在现有 `packages/shared/tests/discovery.test.mjs` 基础上继续冻结 `source-sites.v1.json` 中：
   - `start_urls`
   - `detail_patterns`
   - `discovery_patterns`
   - `max_sitemaps`
   - `max_candidate_urls`
   - `max_discovery_pages`
   的解释口径

6. 至少 1 条 discovery 集成烟测
   验证链路：

```text
query-api seed-run
  -> enqueueDiscoveryBatch
  -> worker-discovery
  -> enqueueDiscoveredTasks
  -> crawl_tasks
```

### 8.5 本阶段不补的测试

Phase 0 不要求在本阶段引入：

- 浏览器 Worker 测试
- 媒体适配器测试
- Topic / Evidence / Artifact 新模型测试

因为这些能力本阶段尚未成为正式运行时。

## 9. Phase 0 建议拆分的 PR

### PR-0A：现状冻结与文档收口

范围：

- 总架构书
- 本文档
- placeholder 说明文档
- 运行时/资产区说明

目标：

- 让团队对“什么是真运行时”达成一致

### PR-0B：worker-discovery 测试化

范围：

- `services/worker-discovery`
- 根 `package.json`
- 相关共享测试
- `query-api` discovery 路由测试补缺口

目标：

- 把 discovery 纳入正式测试体系，让后续目录搬迁有护栏

### PR-0C：目录拆分与镜像搬迁

范围：

- `services/**/upstream-*`
- `tmp_plan0_upstreams`
- 新增 `upstreams/` 与 `labs/`

目标：

- 消灭“假服务目录”

### PR-0D：回归与 Runbook 对齐

范围：

- `docs/首批PR执行计划.md`
- `docs/plan0-stage-d-runbook.md`
- 必要的 smoke / e2e 说明

目标：

- 保证 Phase 0 的结构调整不会把当前闭环跑坏

## 10. Phase 0 验收标准

Phase 0 完成时，至少满足以下标准：

- 任何人看到 `services/` 都不会再把上游镜像当作正式服务
- 根 workspace 只围绕 papaweb 一方代码展开，不再把上游镜像混入 workspace 语义对象
- `apps/crawler` 被明确定位为迁移期工具与证据前身区，而不是平台正式运行时
- `apps/api` 与 `apps/web` 被明确标注为 placeholder
- `worker-discovery` 已有独立测试入口，并接入根 `test:unit`
- `source-sites.v1.json -> discovery -> crawl_tasks` 的解释口径被测试冻结
- `gold_tool_entities` 被正式写死为兼容视图，而不是未来真源
- Phase 1 可以在不再清理目录语义的前提下，直接开始核心数据模型重建

## 11. Phase 0 输出给 Phase 1 的输入物

Phase 0 的最终产物，不是一个“更复杂的当前系统”，而是 5 个输入物：

1. 干净的运行时目录边界
2. 冻结后的当前真源定义
3. `worker-discovery` 测试基线
4. `source-sites.v1.json` 的冻结语义
5. `gold_tool_entities` 的兼容层定位

拿到这 5 个输入物后，Phase 1 才能真正开始重建：

- `Topic`
- `TopicRun`
- `Evidence`
- `EvidenceSet`
- `Artifact`

而不是继续在旧链路和假目录之间摇摆。
