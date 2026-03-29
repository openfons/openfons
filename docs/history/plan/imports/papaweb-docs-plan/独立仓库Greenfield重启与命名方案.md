# 独立仓库 Greenfield 重启与命名方案

> 日期：2026-03-24
> 适用对象：当前 `papaweb` 项目在“彻底重构、独立新仓库、重新命名”前的决策与实施
> 研读来源：
> - `Memory/planx/统一风控对抗平台架构方案.md`
> - `Memory/planx/统一风控对抗平台-Phase0实现级设计.md`
> - `Memory/planx/全平台数据采集与智能分析平台架构方案-v2.md`
> - `docs/plan/同仓库Greenfield重启实施方案.md`
> - `docs/plan/统一风控方案与当前平台升级方案映射说明.md`
> - 当前仓库 `greenfield/dev` 的实际骨架与目录状态

---

## 1. 结论

如果这次目标已经从“在 `papaweb` 内同仓库 Greenfield”升级为：

- 彻底重构
- 摆脱旧名称 `papaweb`
- 不再背着 legacy 历史包袱继续长跑
- 让未来主线、品牌、包名、CI 语义一次性变干净

那么建议正式切换为：

- **新建独立 Git 仓库**
- **新仓库使用全新名称**
- **当前 `papaweb` 退回 legacy / archive / migration-source 角色**
- **未来主开发只在新仓库发生**

换句话说，`同仓库 Greenfield` 不是错，而是它服务的是“保留原仓库配置”的目标；现在你的目标已经变了，所以方案也应该跟着切换。

---

## 2. 为什么现在应该改成独立新仓库

## 2.1 原同仓库方案的前提已经变化

`docs/plan/同仓库Greenfield重启实施方案.md` 当时选择同仓库，核心原因是：

- 保留 GitHub Actions、Secrets、Webhooks、PR 模板
- 保留历史上下文
- 降低组织切换成本

这是一种组织成本最优，而不是架构纯度最优的决策。

如果你现在明确提出：

- 要重新起仓库
- 要重新起名字

那就说明当初“尽量不动仓库外壳”的前提已经不再成立。

## 2.2 当前仓库虽然已进入 Greenfield Bootstrap，但仍然挂着旧语义

当前仓库实际已经具备以下特征：

- 当前分支就是 `greenfield/dev`
- 已存在 `greenfield/main`
- 已有 `packages/contracts`
- 已有 `packages/domain-models`
- README 已经是 Greenfield bootstrap 语义

这说明仓库已经开始“新世界”建设。

但它仍然存在几个不能忽略的问题：

- 仓库名仍然是 `papaweb`
- legacy 历史、过渡治理、Greenfield 主线共处一个仓库
- 分支语义仍然要解释 `legacy main/dev` 与 `greenfield/*` 的并存
- 文档里仍有大量“过渡期”表述，而不是“正式主产品”表述

如果继续在这个仓库上做，未来团队长期会一直背着“过渡态命名”和“过渡态治理”。

## 2.3 你的目标更接近“新产品线”，不是“旧仓升级”

从三份规划文档综合看，未来系统已经不是一个“网页采集脚本仓库”的线性升级，而是一个新产品线：

- 有 `Topic / TopicRun / Evidence / Artifact`
- 有 `TaskSpec / WorkflowSpec / ReportSpec`
- 有 Skill 化能力编排
- 有控制面、运维面、交付面
- 有 Web / API / Skill 多入口

这类变化已经足以支持“新仓库 + 新名字 + 新历史”的独立启动。

---

## 3. 哪些东西必须继承，哪些东西必须丢下

## 3.1 必须继承的架构铁律

以下内容是三份核心规划的共同骨架，必须完整继承到新仓库：

### A. 四大平面

- `Access Plane`
- `Control Plane`
- `Execution Plane`
- `Data & Delivery Plane`

### B. 大模型只负责决策与编译，不直接统管执行

必须坚持：

- Agent 负责理解需求、拆任务、生成结构化计划
- Worker / Workflow 负责确定性执行
- 不能把“大模型直接驱动浏览器”当主执行架构

### C. 平台核心对象必须以证据真源为中心

必须以以下对象为核心：

- `Topic`
- `TopicRun`
- `Evidence`
- `EvidenceSet`
- `Artifact`

### D. 必须有稳定中间态契约

你在对话里提出的“命令下达后要有一个稳定中间态”的诉求是对的，而且应该正式写入新仓库设计：

- `TaskSpec.json`
  说明“要做什么”
- `WorkflowSpec.json`
  说明“具体怎么跑”
- `ReportSpec.json`
  说明“最终怎么交付”
- `Runbook.md`
  作为人类可读审计附件

结论不是“JSON 或 Markdown 二选一”，而是：

- **JSON 负责机器执行**
- **Markdown 负责人工审阅与回放**

### E. Skill 与界面必须互通，而不是二选一

从 `全平台数据采集与智能分析平台架构方案-v2.md` 与你的补充需求一起看，未来入口应明确为：

- 自然语言 / Skill 入口
- Web 控制面入口
- API 入口
- 运维参数控制入口

也就是说：

- Skill 是高灵活入口
- 界面是低 token、强确定性入口
- 两者最终都编译为同一套 `TaskSpec / WorkflowSpec`

### F. LLM 浏览器自动化只能作为兜底 Skill

可以做，但只能以受控 Skill 存在：

- 默认不启用
- 只有常规采集失败或显式指定时才触发
- 有步数、token、超时、熔断、审计边界

它是执行层中的一个受控组件，不是整个平台的默认执行方式。

## 3.2 必须丢下的旧负担

以下内容不应该整体平移到新仓库：

- `papaweb` 这个旧仓库名
- 旧仓库里所有 legacy / archive 分支语义
- `greenfield/*` 这种过渡期分支命名
- 上游镜像目录混入正式运行时的历史包袱
- 把 `gold_tool_entities` 当长期真源的旧语义
- 把 `apps/crawler` 继续误认为新平台主运行时的做法

新仓库要做的是“有选择地吸收资产”，不是“把旧仓再复制一份”。

---

## 4. 新组织与主仓的推荐定位

`openfons` 不应被定位成“爬虫工具集合”或“单一 Web 项目”，而应定位为：

> 以“源”为核心语义的开源信息采集、信号监测、舆情分析与情报研究平台

一句话定义：

> 用户通过自然语言、界面或 API 提交研究任务，系统编译为结构化计划，调用 Skill 和 Worker 完成信息源接入、采集执行、分析研判、证据沉淀与交付。

这一定义比 `papaweb` 更接近未来真实能力边界，也更适合开源组织与主仓的命名。

---

## 5. 命名结论

## 5.1 命名原则

新的 GitHub 组织、npm scope 和主仓名称建议满足：

- 不再带 `web`，因为系统不止 Web
- 不再带 `crawler`，因为系统不只是采集器
- 更适合表达“源、来源、源站、信息源”的长期语义
- 既能解释开源信息采集，也能解释舆情、情报、信号监测
- 适合同时作为 GitHub 组织名、主仓名、npm scope 和包名前缀
- 风格尽量接近 `openmnemo`：组织名简洁、主仓与组织同名、monorepo 承载主体能力

## 5.2 最终主名

当前已经确认创建：

- GitHub 组织：`openfons`
- npm scope / 组织：`@openfons`

因此本方案正式收口到：

- **组织名：`openfons`**
- **主仓名：`openfons/openfons`**
- **npm 包前缀：`@openfons/*`**

原因：

- `fons` 来自“泉源 / 本源 / 源泉”的古典语义，能承接“源”
- `open` 直接表达开源组织属性
- 比 `intel` 更中性，不会把项目限制在狭义安全情报
- 比 `opinion` 更宽，不会把项目限制在单一舆情监测
- 比 `crawler` 更高层，能覆盖采集、编排、分析、交付
- 很适合作为组织名、主仓名和 npm scope 统一根词

如果需要中文工作名，可以先对应为：

- `开放源平台`
- `开源信息源平台`
- `OpenFons 平台`

## 5.3 语义解释

`openfons` 可按下面方式对外解释：

- `open`
  表示开源、开放生态、开放扩展
- `fons`
  表示源、源泉、信息源、本源

组合后的对外语义是：

- 开放的信息源平台
- 开源的多源采集与分析底座
- 面向舆情、情报、研究任务的 Source-native 平台

## 5.4 主仓与包命名规则

建议统一采用：

- 主仓：`openfons/openfons`
- 组织主页：`openfons/.github`
- 核心契约包：`@openfons/contracts`
- 领域模型包：`@openfons/domain-models`
- 技能系统包：`@openfons/skills`
- 共享能力包：`@openfons/shared`
- 控制面应用：`apps/control-web`
- 运维面应用：`apps/ops-web`
- 控制面服务：`services/control-api`
- 源注册中心：`services/source-registry`

这套规则的核心优点是：

- 与 `openmnemo` 风格一致
- 用户只需要记住一个根词：`openfons`
- GitHub 组织、主仓、npm scope、内部包命名完全统一

## 5.5 备选名的处理方式

既然 `openfons` 组织和 npm scope 已创建，其他备选名不再建议作为新的组织名。

如果后续仍想保留“舆情 / 情报 / 信号”表达，可以把它们降级为：

- 产品线名
- 模块名
- 文档副标题
- 示例仓库名

例如：

- `OpenFons Signal Watch`
- `OpenFons Intel Workflow`
- `OpenFons Public Signal`

---

## 6. 新仓库不应该怎么建

不建议：

- 直接把当前仓库整个 `git clone --mirror` 后改名继续跑
- 把 `greenfield/dev` 直接整体复制过去当未来默认主线
- 把所有旧服务目录一股脑搬进新仓库
- 把过渡期文档、legacy 守护逻辑、历史上游资产一起带走

这样做只是“换了个仓库地址”，不是“真正重启”。

---

## 7. GitHub 组织与仓库规划

## 7.1 组织层采用 `openmnemo` 风格

参考 `openmnemo` 的组织方式，`openfons` 建议采用：

- `openfons/.github`
  组织主页、默认 Issue / PR 模板、社区规范
- `openfons/openfons`
  唯一旗舰主仓，使用 monorepo 承载主系统

先不要一开始拆很多小仓库。

最稳的顺序是：

- 先把主系统收敛到一个主仓
- 等接口、适配器、示例、文档站真的稳定后再拆卫星仓

## 7.2 第一阶段建议保留的仓库数

第一阶段建议只保留这两个公开仓库：

- `openfons/.github`
- `openfons/openfons`

如果过早拆成很多仓库，问题会很明显：

- CI 复杂度上升
- 文档入口分散
- issue 和 roadmap 分裂
- 社区用户不知道主入口在哪

## 7.3 后续可选卫星仓

等主仓稳定后，再按需要拆：

- `openfons/examples`
- `openfons/docs`
- `openfons/adapters`
- `openfons/awesome-openfons`

但这一步不应早于主仓稳定运行。

---

## 8. 新主仓应该怎么建

## 8.1 Git 策略

建议 `openfons/openfons` 采用：

- 全新初始化仓库历史
- 首个提交就是新仓库骨架
- 只选择性迁入经过确认的资产

这样做的价值是：

- 第一条提交开始就语义干净
- 没有 `legacy/main/dev` 与 `greenfield/*` 的历史债
- 新仓库可以直接用正常分支模型

## 8.2 分支模型

新仓库既然本身就是 Greenfield，就不需要再保留 `greenfield/*` 命名。

建议直接恢复为标准主线：

- `main`
- `dev`
- `feature/*`
- `fix/*`
- `release/*`
- `hotfix/*`

也就是说：

- 在旧仓里用 `greenfield/*` 是为了和 legacy 并存
- 到了新仓里，**新仓本身就是主线**，无需再加 `greenfield` 前缀

## 8.3 初始目录建议

```text
openfons/
  apps/
    control-web/
    ops-web/
  services/
    control-api/
    source-registry/
    report-api/
    visualization-api/
    worker-seed/
    worker-discovery/
    worker-fetch-http/
    worker-normalize/
    worker-quality/
    publish-evidence/
  packages/
    contracts/
    domain-models/
    skills/
    adapters/
    policy-engine/
    shared/
    sdk-observability/
  config/
    sources/
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
    plan/
    runbooks/
  tests/
    contract/
    integration/
    e2e/
```

这个结构和当前同仓库 Greenfield 方案的核心思想一致，但做了两点强化：

- 增加 `packages/skills/`，正面承接 Skill 化能力
- 移除所有 legacy / upstream / placeholder 的历史拖尾

---

## 9. 建议迁入新仓库的资产清单

## 9.1 第一批就该迁入的

- 当前规划文档里仍然有效的总架构约束
- `packages/contracts`
- `packages/domain-models`
- `packages/shared` 中真正与 Greenfield 契约有关的基础模块
- Greenfield bootstrap 测试骨架
- 新仓库的 CI / hook / PR 模板

## 9.2 第二批按需迁入的

- `worker-discovery` 中可复用的确定性逻辑
- `worker-fetch-http` 中可靠的抓取通道抽象
- `worker-normalize` / `worker-quality` 中可保留的规则
- `policy-engine` 中可直接迁用的策略表达

原则是：

- 迁“能力”
- 不迁“目录历史”
- 迁“经过重新审视的模块”
- 不迁“未经重构的整块旧系统”

## 9.3 不建议直接迁入的

- 所有上游镜像目录
- `apps/crawler` 的旧入口语义
- 旧平台占位应用
- 旧的 `gold_tool_entities` 依赖语义
- 所有仅服务于过渡期的 `greenfield/*` 治理说明

---

## 10. 新仓库的第一阶段范围

新仓库第一阶段不要铺太大，建议只做下面四件事：

## 10.1 先把契约和真源落稳

第一阶段必须优先落地：

- `TaskSpec`
- `WorkflowSpec`
- `ReportSpec`
- `Topic`
- `TopicRun`
- `Evidence`
- `EvidenceSet`
- `Artifact`

## 10.2 先跑通最小执行闭环

执行链路建议保持克制：

- `seed`
- `discovery`
- `fetch-http`
- `normalize`
- `quality`
- `publish-evidence`

不要在第一天就同时上：

- 浏览器自动化主链路
- 多媒体采集
- 复杂门户
- 大而全的运营后台

## 10.3 同时落一个最小控制面

你已经明确表达“不能只有 Skill，还需要界面化与运维化入口”。

所以新仓库第一阶段就应该保留两个最小界面：

- `control-web`
  - 下任务
  - 看运行
  - 重试 / 取消
- `ops-web`
  - 并发
  - 配额
  - 熔断
  - 任务开关

## 10.4 Skill 与界面统一落到同一编译层

无论入口来自哪里：

- Skill
- Web 界面
- API

最终都只进入同一条编译链：

`Intent -> TaskSpec -> WorkflowSpec -> Worker Execution`

这样才不会出现“一套给聊天用、一套给页面用”的双轨平台。

---

## 11. 对当前 `papaweb` 仓库的建议定位

一旦新仓库启动，当前仓库建议降级为：

- legacy 参考仓
- 迁移素材仓
- 旧运行时回归对照仓
- 历史文档与旧闭环留档仓

它不再承担：

- 新产品主线开发
- 新品牌主仓
- 新平台正式发布

最重要的一条是：

- **不要让两个仓库同时长期承担“未来主线”角色**

必须明确只有一个未来主仓。

---

## 12. 推荐执行顺序

## T0：冻结当前判断

先在当前仓库确认：

- `papaweb` 将退居 legacy
- 新仓库将成为未来主仓
- 命名优先候选确定

## T1：创建新仓库骨架

初始化：

- 新仓库名
- `AGENTS.md`
- CI
- PR 模板
- pre-push hook
- workspace
- `docs/adr`
- `docs/plan`

## T2：迁入核心契约与测试骨架

迁入：

- `contracts`
- `domain-models`
- 最小 shared
- contract / integration / e2e bootstrap tests

## T3：建立最小执行闭环

先跑通：

- 结构化任务定义
- 确定性执行链
- Evidence 发布

## T4：建立控制面与运维面

补齐：

- `control-api`
- `control-web`
- `ops-web`
- `/api/v2/*` 或等价控制面接口

## T5：接入 Skill 与受控 LLM 兜底能力

最后再补：

- Skill 注册与调度
- 受控浏览器 LLM Skill
- 高风险能力熔断策略

---

## 13. 最终建议

如果你这次是真想“重新来一次，而且不要再给未来留仓库层面的技术债”，那么最稳的选择就是：

- **保留 `papaweb` 作为 legacy**
- **未来主开发切到 `openfons/openfons`**
- **GitHub 组织、主仓、npm scope 统一使用 `openfons`**
- **组织结构先收敛为 `.github + openfons` 两个仓库**

这条路比继续在当前仓库里叠更多 `greenfield/*` 规则更干净，也更符合你现在已经明确表达的目标。
