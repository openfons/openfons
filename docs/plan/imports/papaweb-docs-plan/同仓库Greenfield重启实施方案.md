# 同仓库 Greenfield 重启实施方案

> 日期：2026-03-23
> 适用对象：`papaweb` 当前仓库
> 约束来源：
> - [统一风控对抗平台架构方案](./统一风控对抗平台架构方案.md)
> - [统一风控对抗平台-Phase0实现级设计](./plan0/统一风控对抗平台-Phase0实现级设计.md)
> - [平台级重构架构与目录方案](./plan0/平台级重构架构与目录方案.md)

---

## 1. 结论

本方案采用：

- **同一个 GitHub 仓库继续使用**
- **旧主线归档保留**
- **新架构在新主线分支上 Greenfield 重启**
- **待新架构稳定后，再正式接管 `main/dev`**

这不是“继续在旧代码上小修小补”，而是：

- 不新开仓库
- 但在同仓库内，启动一条逻辑上独立的新产品线

这是当前兼顾“最佳实践”和“保留现有 GitHub 配置”的最优解。

---

## 2. 为什么不直接新开仓库

如果只看纯技术洁癖，新开仓库当然最干净。

但对当前团队来说，同仓库方案有明显现实优势：

1. 保留现有 GitHub 配置
   - Actions
   - Secrets
   - Webhooks
   - PR 模板
   - Issue 流程
   - 团队成员权限

2. 保留历史上下文
   - 旧主线仍可作为迁移参考
   - 旧 PR、旧提交、旧闭环可继续审计

3. 降低组织切换成本
   - 不需要重新配置仓库治理
   - 不需要重新分发地址与权限
   - 不需要重新绑定自动化

所以本方案不建议“仓库层级切割”，而建议“主线层级切割”。

---

## 3. 为什么不建议今天直接重用当前 `main/dev`

虽然可以强行把当前 `main/dev` 重置成新世界，但这不是最佳实践。

原因有 4 个：

1. **历史语义会断裂**
   - 当前 `main/dev` 代表的是旧架构主线
   - 如果直接把它们切换成新架构，后续历史回溯会很乱

2. **现有分支会全部失去语义**
   - 当前仓库还存在大量 `feature/*`、`fix/*`、`backup/*`
   - 一旦直接重置 `dev`，这些分支会全部挂在“旧世界”上，极易混淆

3. **主分支切换风险太集中**
   - 当前 `main/dev` 已服务过现有闭环
   - 如果立刻切换，任何 CI、自动化、团队默认行为都会同时受影响

4. **从第一天就在主线语义上留债**
   - 你们明确要求“不给未来留技术债”
   - 那就不应该在“主分支语义”上做模糊过渡

因此，本方案建议：

- **旧 `main/dev` 先冻结**
- **新架构先跑在 `greenfield/*` 主线上**
- **等新架构稳定后，再正式接管 `main/dev`**

---

## 4. 目标状态

### 4.1 旧世界

旧世界继续存在，但降级为：

- 现有闭环参考仓库
- 历史实现与迁移参考
- 回归对照对象
- 必要时的兼容链路维护线

旧世界不再承担：

- 未来主架构演进
- 新平台正式能力建设
- 新产品线主干开发

### 4.2 新世界

新世界在同仓库内开启一条独立主线，用于承载：

- `Topic / TopicRun / Evidence / EvidenceSet / Artifact`
- `TaskSpec / WorkflowSpec / ReportSpec`
- `Source Registry`
- `Policy Gate`
- 新控制面
- 新执行层
- 新交付层

也就是说：

- 旧仓库保留
- 但未来主语义切换到新主线

---

## 5. 分支设计

### 5.1 旧主线归档

在执行 Greenfield 重启前，先固定两个归档分支：

- `archive/main-legacy-20260323`
- `archive/dev-legacy-20260323`

同时打不可变标签：

- `legacy-main-cutover-20260323`
- `legacy-dev-cutover-20260323`

作用：

- 归档分支用于继续浏览和必要的只读对照
- 标签用于“绝对锚点”，防止后续误改历史定位

### 5.2 新主线

Greenfield 新主线使用：

- `greenfield/main`
- `greenfield/dev`

角色定义：

- `greenfield/dev`
  - 新架构的日常集成分支
  - 所有新功能先合入这里

- `greenfield/main`
  - 新架构的发布准备与稳定分支
  - 只接收来自 `greenfield/dev` 的验证通过变更

### 5.3 新功能分支

为了避免和旧分支混淆，新功能分支建议统一加 `gf` 前缀：

- `feature/gf-*`
- `fix/gf-*`
- `release/gf-*`

例如：

- `feature/gf-domain-models`
- `feature/gf-source-registry`
- `fix/gf-run-state-machine`

这些分支全部从 `greenfield/dev` 切出，并只合回 `greenfield/dev`。

---

## 6. 与当前 `AGENTS.md` 的关系

当前 [AGENTS.md](../AGENTS.md) 的规则是：

- `main` 是生产分支
- `dev` 是日常集成分支
- `feature/*` 从 `dev` 切出并合回 `dev`

这套规则适用于当前旧主线，但不适用于 Greenfield 重启阶段。

因此本方案要求采用“先治理准备，再启动 Greenfield 主线”的方式。

### 6.1 治理准备 PR（提交到当前 `dev`）

在创建 `greenfield/*` 之前，必须先提交一个**治理准备 PR**到当前 `dev`。

这个 PR 只允许包含治理与协作改动，不允许混入业务实现代码。

必须至少覆盖：

- `AGENTS.md`
  - 增补 Greenfield 过渡规则
  - 明确 legacy `main/dev` 的冻结语义
- `.github/PULL_REQUEST_TEMPLATE.md`
  - 明确 Greenfield 阶段的目标分支与自检项
- `.github/workflows/*`
  - 让 `greenfield/dev`、`greenfield/main` 能触发 CI/E2E
  - 必要时新增独立 `ci-greenfield` / `e2e-greenfield` 工作流
- 根脚本与 CI 入口
  - 为 Greenfield 提供独立测试入口，例如 `test:gf:*`
  - 避免直接复用 legacy `npm run test:unit` 语义
- 本地 hook 与安装说明
  - 拦截直推 `greenfield/main`
  - 拦截直推 `greenfield/dev`
  - 继续拦截 legacy `main/dev`

### 6.2 治理准备 PR 合并后的规则

只有在治理准备 PR 合并之后，才允许继续执行下面动作：

- 创建 `greenfield/main`
- 创建 `greenfield/dev`
- 提交 `feature/gf-*` 与 `fix/gf-*`
- 向 `greenfield/dev` 发业务实现 PR

也就是说：

- **不允许先开 Greenfield 分支，再慢慢补治理**
- **不允许在没有 Greenfield CI/Hook/模板护栏的情况下开始新主线开发**

---

## 7. GitHub 与协作治理建议

### 7.1 legacy 冻结的执行定义

从治理准备 PR 合并、并完成 Greenfield 分支创建起：

- legacy `dev`
  - 停止接收新功能 PR
  - 停止接收架构重构 PR
  - 只允许紧急修复、必要回滚、历史文档澄清

- legacy `main`
  - 只允许正式发布、紧急修复、必要回滚
  - 不再承载未来主架构建设

这条规则必须在团队层面明确宣布，不能只停留在文档表述上。

### 7.2 默认分支

推荐分两阶段处理：

#### 阶段 A：准备期

默认分支先不动，仍保持当前设置。

原因：

- 避免在创建 `greenfield/*` 前让所有 PR 默认目标混乱

#### 阶段 B：Greenfield 启动后

一旦 `greenfield/dev` 完成：

- 仓库基础骨架
- CI 骨架
- 文档规则更新
- 第一批 ADR

就建议把仓库默认分支切换为：

- `greenfield/dev`

这样可以减少团队误向 legacy `dev` 提 PR 的风险。

### 7.3 分支保护

如果仓库版本支持分支保护，建议对以下分支分别配置：

- `greenfield/dev`
- `greenfield/main`
- `main`
- `dev`

规则建议：

- `greenfield/dev`
  - 禁止直推
  - 必须 PR
  - 必须 CI 通过

- `greenfield/main`
  - 禁止直推
  - 仅允许来自 `release/gf-*` 或 `greenfield/dev`
  - 必须 reviewer 审批

- `main`
  - 进入 legacy 冻结状态
  - 非紧急维护禁止继续合并

- `dev`
  - 进入 legacy 冻结状态
  - 非紧急维护禁止继续合并

### 7.4 本地 pre-push hook

本地 hook 也要同步升级，至少拦截：

- 直接 push 到 `greenfield/main`
- 直接 push 到 `greenfield/dev`
- 继续误 push 到 legacy `main/dev`

---

## 8. 旧分支处理策略

当前仓库中已有大量历史分支。

本方案建议如下：

### 8.1 直接进入 legacy 状态

以下分支全部视为历史分支，不再继续作为未来主线开发基础：

- 现有 `feature/*`
- 现有 `fix/*`
- 现有 `backup/*`
- 其他与当前旧主线相关的临时分支

### 8.2 不强制立刻删除

不建议第一天就删除这些分支。

原因：

- 其中可能还有迁移参考价值
- 删除会增加心理成本和回溯成本

### 8.3 统一标记为 legacy

建议在团队约定中写清：

- 这些分支只读
- 不再往上追加新提交
- 如需复用代码，只能通过：
  - 明确 ADR
  - 明确差异审阅
  - 明确 cherry-pick 或重写接入

换句话说：

**旧分支只能作为素材来源，不能作为新主线祖先。**

---

## 9. Greenfield 仓库结构建议

新主线不再沿用当前混杂结构，而采用明确的目标形态。

建议直接采用如下结构：

```text
papaweb/
  services/
    orchestrator-airflow/
    control-api/
    source-registry/
    query-api/
    report-api/
    visualization-api/
    worker-seed/
    worker-discovery/
    worker-fetch-http/
    worker-fetch-browser/
    worker-normalize/
    worker-quality/
    publish-evidence/
  packages/
    contracts/
    domain-models/
    policy-engine/
    adapters/
    shared/
    sdk-observability/
  apps/
    control-web/
    ops-web/
  config/
    source-registry/
    policies/
    templates/
  data/
    postgres/
    dbt/
    clickhouse/
  infra/
    docker/
    k8s/
    monitoring/
  docs/
    adr/
    runbooks/
    plan/
  tests/
    contract/
    integration/
    e2e/
```

这里最关键的是：

- 不再把上游镜像放进正式运行时目录
- 不再保留“placeholder 冒充正式应用”的路径
- 不再混用旧脚本目录与新平台目录

---

## 10. 新主线的实施顺序

Greenfield 新主线必须服从当前两份核心方案文档的顺序，不允许倒着做。

### Stage 0：仓库启动

先做：

- 新主线分支建立
- 新规则文档
- ADR 骨架
- CI 骨架
- 最小 workspace

输出物：

- `greenfield/dev`
- `greenfield/main`
- Greenfield 协作规则

### Stage 1：核心契约与真源

先做：

- `TaskSpec / WorkflowSpec / ReportSpec`
- `Topic / TopicRun / Evidence / EvidenceSet / Artifact`
- `Source Registry` authoring 真源定义
- `Policy Gate` 契约

输出物：

- `packages/contracts`
- `packages/domain-models`
- PostgreSQL 初版 schema

### Stage 2：执行最小闭环

先做：

- `worker-seed`
- `worker-discovery`
- `worker-fetch-http`
- `worker-normalize`
- `worker-quality`
- `publish-evidence`

要求：

- 先跑通确定性闭环
- 不急着上浏览器、媒体和门户

### Stage 3：控制面

再做：

- `control-api`
- `run-api`
- `task-api`
- `artifact-api`
- `control-web`

要求：

- 控制面建立在正式真源之上
- 不允许前端反向定义底层真源

### Stage 4：扩展执行与交付

再做：

- 浏览器执行层
- 媒体采集层
- Renderer
- Template Center
- report-api
- visualization-api

### Stage 5：门户与运营层

最后做：

- Dashboard
- Watch Center
- Evidence Explorer
- Ops 页面

---

## 11. 什么时候接管 `main/dev`

只有满足以下条件，才建议从 `greenfield/*` 过渡到正式接管 `main/dev`：

1. `greenfield/dev` 已完成最小闭环
   - Topic 真源
   - Evidence 真源
   - Artifact 真源
   - Source Registry
   - 最小执行链路

2. 已跑过至少一轮端到端验证
   - CI 通过
   - E2E 通过
   - Smoke 通过

3. 控制面已能覆盖最小用户动作
   - 新建任务
   - 查看 run
   - 查看 evidence/artifact

4. 团队内部已明确宣布：
   - legacy `main/dev` 停止作为日常开发主线
   - 新主线准备接管正式语义

### 11.1 推荐接管方式（两阶段、非破坏式）

推荐把“接管 `main/dev`”拆成两个阶段，而不是一步完成。

#### 阶段 A：先接管正式语义，不急着接管名字

先完成下面动作：

1. `greenfield/dev` 达到最小闭环
2. 将仓库默认分支切换到 `greenfield/dev`
3. 所有新 PR 默认目标改为 `greenfield/dev`
4. legacy `main/dev` 保持冻结、只读、可审计

完成阶段 A 后，虽然名字还是 `greenfield/*`，但仓库的**正式开发语义**已经完成切换。

#### 阶段 B：再接管 `main/dev` 这两个名字

只有在 Greenfield 主线稳定运行一段时间后，才建议执行名字接管。

推荐顺序必须是：

1. 再打一次 cutover 不可变标签
2. 确认 legacy `main/dev` 已存在最终归档分支
3. 确认没有未关闭 PR 仍指向 legacy `main/dev`
4. 将 legacy `dev` 重命名为最终冻结名，例如 `legacy/dev-frozen`
5. 将 legacy `main` 重命名为最终冻结名，例如 `legacy/main-frozen`
6. 将 `greenfield/dev` 重命名为 `dev`
7. 将 `greenfield/main` 重命名为 `main`
8. 同步更新默认分支、分支保护、PR 模板、hook 与相关文档

整个过程必须保证：

- 不改写提交历史
- 不丢失 legacy 锚点
- 不让任何旧 PR 悬挂在失效分支上

### 11.2 不推荐的方式

- 不打标签直接覆盖
- 不留 legacy 锚点直接改 `main/dev`
- 同时长期维护两套活跃 `main/dev`
- force-push 改写 `main/dev` 历史
- 直接 `reset --hard` 或删除旧主线而不先建立归档锚点

---

## 12. 风险与对策

### 12.1 风险：团队误向 legacy 分支提交

对策：

- 默认分支切到 `greenfield/dev`
- 更新 AGENTS
- 升级本地 hook
- PR 模板强调目标分支

### 12.2 风险：旧代码被“偷运”进新主线

对策：

- 明确 legacy 分支只读
- 所有复用代码必须明确标注来源
- 优先迁移能力，不迁移旧边界

### 12.3 风险：Greenfield 过久，形成第二个技术债岛

对策：

- 严格按 Stage 0~5 推进
- 每个阶段有明确验收
- 不允许在 Stage 1 未稳前提前铺控制面大页面

### 12.4 风险：GitHub 配置仍指向旧主线

对策：

- 将切换默认分支列为 Stage 0 验收项
- 逐项检查 Actions、PR 模板、hook、团队文档

---

## 13. 第一批 PR 建议

Greenfield 启动后，建议第一批 PR 先分为“过渡治理 PR”与“Greenfield 实现 PR”两组。

0. `PR-T0`
   - 目标分支：当前 `dev`
   - 仅包含治理准备改动
   - 更新 `AGENTS.md`
   - 更新 PR 模板
   - 更新/新增 Greenfield CI 与 E2E 工作流
   - 增加 Greenfield 独立测试入口
   - 升级 hook 与安装说明

1. `PR-GF-01`
   - 建立 `greenfield/dev` 基础骨架
   - 初始化 `greenfield/main`
   - 建立 Greenfield 最小 workspace
   - 验证 `greenfield/dev` 上的 CI/E2E 真正可触发

2. `PR-GF-02`
   - `packages/contracts`
   - `packages/domain-models`
   - 初版 schema

3. `PR-GF-03`
   - `source-registry`
   - `policy-gate`
   - 配置模型

4. `PR-GF-04`
   - `worker-seed`
   - `worker-discovery`
   - discovery 契约测试

5. `PR-GF-05`
   - `worker-fetch-http`
   - `worker-normalize`
   - `worker-quality`

6. `PR-GF-06`
   - `publish-evidence`
   - `query-api`
   - 最小闭环 E2E

要求：

- 每个 PR 都必须带测试证据
- 不允许“先合并后补测”
- 不允许把 Greenfield 骨架和 legacy 兼容补丁混在同一个 PR
- `PR-T0` 是唯一允许先落在 legacy `dev` 的 Greenfield 过渡 PR

---

## 14. 立即执行清单

按本方案，第一步不应该是写业务代码，而应该先做下面这些事：

1. 提交 `PR-T0` 到当前 `dev`
2. 合并 `PR-T0`
3. 正式宣布 legacy `main/dev` 冻结
4. 创建 legacy 归档分支与不可变标签
5. 从已完成治理准备的 `dev` 创建 `greenfield/main` 与 `greenfield/dev`
6. 提交本实施方案文档与 Greenfield 协作规则文档
7. 新增第一批 ADR 骨架
8. 再开始 `PR-GF-01`

---

## 15. 最终判断

对当前团队最优的路径不是：

- 继续在旧 `dev` 上堆平台后台
- 也不是立刻抹掉当前 `main/dev`

而是：

- **同仓库**
- **旧主线归档**
- **新主线 Greenfield**
- **稳定后再接管正式主分支**

这条路既能保住现有 GitHub 治理资产，又能最大限度避免未来主架构继续背旧债。
