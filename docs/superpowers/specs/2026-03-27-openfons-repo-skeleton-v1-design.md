# OpenFons Repo Skeleton v1 Design

> 日期：2026-03-27
> 状态：已在本次会话中完成分段确认
> 适用范围：OpenFons 长期目标态仓库目录蓝图，以及从蓝图中拆出的首个实施子项目

## 1. 设计目标

为 OpenFons 建立一份长期目标态仓库目录蓝图，并明确：

1. 正式运行时代码应该放在哪里
2. 文档、记忆、实验区应如何与运行时代码并列共存
3. 哪些目录是长期目标态的一部分
4. 哪些目录是 `v1` 必建、`v1-lite`、`v2+`
5. 从这份长期蓝图中，首个实施子项目应如何拆出

这份设计稿优先服务团队内部开发落地，但表达方式也要足够清楚，便于统一架构认知。

## 2. 非目标

当前设计稿不承担以下职责：

1. 不直接生成实施计划
2. 不直接创建所有目录和代码骨架
3. 不把长期目标态误写成当前 sprint 待办清单
4. 不把 `labs/`、`docs/`、`Memory/` 变成运行时代码的一部分
5. 不在本阶段强行决定所有未来服务必须独立部署

## 3. 核心设计原则

### 3.1 长期目标态完整表达

本次目录蓝图采用“目标态全展开型”表达方式：

1. 长期应该存在的目录会完整画出来
2. 但会显式区分 `v1`、`v1-lite`、`v2+`
3. 避免团队把长期蓝图误读成当前待实现清单

### 3.2 开发落地优先于表面整洁

如果在“根目录看起来纯净”和“目录边界真正清楚”之间二选一，优先后者。

因此：

1. `docs/`、`Memory/`、`labs/` 继续保留在仓库根目录
2. 它们作为一级资产与运行时代码并列存在
3. 不为了形式整洁把它们塞进 `meta/` 或其他包装目录

### 3.3 主工程语言策略

长期目录蓝图按以下语言策略设计：

1. `TypeScript / Node.js` 作为主工程语言
2. `React + TanStack Router / Start` 作为前端骨架
3. `Python` 作为辅助工程语言，承担少数采集适配、模型推理、OCR 和局部 worker
4. `Rust` 暂不作为当前主工程语言，只保留为未来性能热点或底层能力的后备选择

### 3.4 一级结构采用 `apps / services / packages`

长期目录采用：

1. `apps/`：面向人的应用壳
2. `services/`：面向系统的可运行服务
3. `packages/`：共享契约与共享库

这样可以让“产品壳”“系统职责域”“共享契约层”长期保持清晰边界。

### 3.5 长期逻辑拆分，短期物理收敛

在 `services/` 层：

1. 长期按职责域拆分
2. 近期实现允许物理收敛为少数可运行单元
3. 不允许为了目录完整而提前铺满空壳服务

### 3.6 应用壳长期分离

长期保留：

1. `control-web`
2. `report-web`
3. `ops-web`

其中：

1. `control-web` 与 `report-web` 长期分离
2. `ops-web` 长期保留，但不是第一批必建

### 3.7 `data/` 不是运行时证据仓

`data/` 只用于：

1. fixtures
2. seeds
3. samples
4. mock outputs

不用于长期承载：

1. 抓取结果
2. 真实证据
3. 正式交付产物

### 3.8 `infra/` 可以完整表达，但不等于首批全做

长期蓝图承认：

1. `docker`
2. `k8s`
3. `terraform`
4. `monitoring`
5. `deployment`
6. `secrets`

但这些目录的存在，不代表它们都属于首批实施范围。

## 4. 长期目标态一级目录

```text
openfons/
  apps/
  services/
  packages/
  config/
  data/
  infra/
  docs/
  Memory/
  labs/
  tests/
  scripts/
  .github/
```

## 5. 一级目录职责

### 5.1 运行时代码区

1. `apps/`
   面向人的产品壳与交付界面
2. `services/`
   API、registry、worker、publish、render 等系统职责域
3. `packages/`
   契约、模型、共享库、能力封装、策略与适配层

### 5.2 工程支撑区

1. `config/`
   配置真源
2. `data/`
   开发辅助数据
3. `infra/`
   基础设施与部署资产
4. `tests/`
   跨层测试
5. `scripts/`
   仓库级自动化脚本
6. `.github/`
   CI 与仓库自动化

### 5.3 非运行时一级资产

1. `docs/`
   正式文档与 SoT
2. `Memory/`
   项目记忆与会话连续性
3. `labs/`
   隔离实验与兼容性验证区

## 6. `apps / services / packages` 二级目录

### 6.1 Apps

```text
apps/
  control-web/        # v1
  report-web/         # v1
  ops-web/            # v2+ / 长期保留位
```

1. `control-web`
   内部控制面 Web 应用，负责意图确认、任务入口、证据浏览、流程查看与配置入口
2. `report-web`
   外部交付与公开页面应用，负责报告页、案例页、SEO 内容页与对外交付展示
3. `ops-web`
   运维/审核/回放后台，长期保留，但不抢首批主线

### 6.2 Services

```text
services/
  control-api/          # v1
  source-registry/      # v1-lite
  report-api/           # v1-lite
  visualization-api/    # v2+
  publish-evidence/     # v2+
  worker-runner/        # v1-lite
  worker-seed/          # v2+
  worker-discovery/     # v2+
  worker-fetch-http/    # v2+
  worker-fetch-browser/ # v2+
  worker-normalize/     # v2+
  worker-quality/       # v2+
  worker-analysis/      # v2+
  worker-render/        # v2+
  scheduler-gateway/    # v2+
```

关键说明：

1. 长期承认这些职责域存在
2. 近期实现不要求它们一开始全部成为独立物理部署单元
3. `worker-runner` 可以在早期托住首批执行能力，再逐步拆细

各职责域摘要：

1. `control-api`
   控制面主服务，承接 `OpportunitySpec / TaskSpec / WorkflowSpec / ReportSpec` 编译与校验
2. `source-registry`
   来源与适配能力目录服务
3. `report-api`
   报告与交付契约服务
4. `visualization-api`
   图谱、趋势、统计等高级视图服务
5. `publish-evidence`
   发布报告、证据与交付物
6. `worker-runner`
   首批受控执行入口
7. `worker-*`
   长期职责域，按阶段逐步拆开
8. `scheduler-gateway`
   长期编排、预算、门禁与调度集成入口

### 6.3 Packages

```text
packages/
  contracts/         # v1
  domain-models/     # v1
  shared/            # v1
  skills/            # v1-lite
  adapters/          # v1-lite
  policy-engine/     # v1-lite
  sdk-observability/ # v2+
  ui-kit/            # v2+
  config-schema/     # v1-lite
```

1. `contracts`
   全仓核心契约真源，优先承接 `OpportunitySpec / TaskSpec / WorkflowSpec / ReportSpec`
2. `domain-models`
   承接 `Topic / TopicRun / Evidence / EvidenceSet / Artifact`
3. `shared`
   少量真正共享的基础能力
4. `skills`
   技能定义与技能装配层
5. `adapters`
   来源适配器与外部能力接入层
6. `policy-engine`
   风险、预算、权限、门禁判断
7. `sdk-observability`
   tracing、metrics、logging 的统一封装
8. `ui-kit`
   共享前端组件与设计系统
9. `config-schema`
   配置结构定义与校验

## 7. `config / data / infra / tests / scripts` 设计

### 7.1 Config

```text
config/
  sources/           # v1-lite
  policies/          # v1-lite
  templates/         # v1-lite
  prompts/           # v2+
  environments/      # v2+
  examples/          # v2+
```

规则：

1. `config/` 只放声明式配置
2. 不放业务逻辑代码
3. 运行时生成数据不得回写到 `config/`

### 7.2 Data

```text
data/
  fixtures/          # v1
  seeds/             # v1-lite
  samples/           # v1
  mock-outputs/      # v1-lite
  temp/              # 本地开发区，不进正式版本控制
```

规则：

1. `data/` 不是运行时证据仓
2. 不长期保存真实抓取结果和正式交付产物
3. 只服务开发、测试和演示

### 7.3 Infra

```text
infra/
  docker/            # v1-lite
  k8s/               # v2+
  terraform/         # v2+
  cloud/             # v2+
  monitoring/        # v1-lite
  secrets/           # 模板与约定，不放真实密钥
  deployment/        # v1-lite
  local-dev/         # v1-lite
```

规则：

1. `infra/` 可以完整展开
2. 但不能被误读为“首批都要建”
3. `secrets/` 只放模板和说明，不放真实密钥

### 7.4 Tests

```text
tests/
  contract/          # v1
  integration/       # v1
  e2e/               # v1-lite
  smoke/             # v1
  fixtures/          # v1-lite
  performance/       # v2+
```

规则：

1. 首批测试优先守住 `contract / integration / smoke`
2. `e2e` 先薄做
3. `performance` 长期保留，但不是第一批重点

### 7.5 Scripts

```text
scripts/
  bootstrap/         # v1-lite
  dev/               # v1
  check/             # v1
  sync/              # v1-lite
  import/            # v1-lite
  release/           # v2+
  scaffolds/         # v2+
```

规则：

1. 脚本按用途归类
2. 不允许在根目录散落临时脚本
3. 仓库级自动化统一落 `scripts/`

## 8. `v1 / v1-lite / v2+` 优先级划分

### 8.1 `v1` 必建目录

```text
apps/
  control-web/
  report-web/

services/
  control-api/

packages/
  contracts/
  domain-models/
  shared/

config/
  sources/
  policies/
  templates/

tests/
  contract/
  integration/
  smoke/

scripts/
  dev/
  check/

infra/
  docker/
  local-dev/
```

### 8.2 `v1-lite` 目录

```text
services/
  source-registry/
  report-api/
  worker-runner/

packages/
  skills/
  adapters/
  policy-engine/
  config-schema/

config/
  environments/

data/
  seeds/
  mock-outputs/

scripts/
  bootstrap/
  sync/
  import/

infra/
  monitoring/
  deployment/
```

### 8.3 `v2+` 目录

```text
apps/
  ops-web/

services/
  visualization-api/
  publish-evidence/
  worker-seed/
  worker-discovery/
  worker-fetch-http/
  worker-fetch-browser/
  worker-normalize/
  worker-quality/
  worker-analysis/
  worker-render/
  scheduler-gateway/

packages/
  sdk-observability/
  ui-kit/

config/
  prompts/
  examples/

tests/
  e2e/
  performance/

infra/
  k8s/
  terraform/
  cloud/
  secrets/
```

## 9. 当前禁止提前建空壳的目录与方式

### 9.1 禁止的空壳行为

1. 只建目录，不写职责说明
2. 只放 README 冒充实现
3. 一开始铺满 `worker-*` 目录，但没有首批可运行入口
4. 提前建 `ops-web` 壳子，却没有确定场景
5. 在主链未通前铺满 `k8s / terraform`
6. 把未定边界的业务逻辑持续塞进 `packages/shared`

### 9.2 硬规则

1. 任何新目录，必须回答“它现在服务哪条主链”
2. 任何新 package，必须回答“谁依赖它”
3. 任何新 service，必须回答“它是物理部署单元，还是当前仅为职责域”
4. 说不清楚，就不要先建

## 10. 目录间依赖规则

### 10.1 根规则

```text
apps       -> packages
apps       -> services（通过 API / client / contract）
services   -> packages
tests      -> apps / services / packages
scripts    -> config / apps / services / packages

docs / Memory / labs
  不参与运行时代码依赖
```

### 10.2 Apps 规则

1. `apps/*` 可以依赖 `packages/*`
2. `apps/*` 可以调用 `services/*` 暴露出来的 API
3. `apps/*` 不能直接 import `services/*` 源码
4. `control-web` 与 `report-web` 不互相吞业务逻辑

### 10.3 Services 规则

1. `services/*` 可以依赖 `packages/*`
2. `services/*` 不能依赖 `apps/*`
3. `services/*` 之间不做源码级长链互相 import
4. 服务之间若要通信，应走 API、事件或明确契约层

### 10.4 Packages 长期分层

```text
contracts
  ↓
domain-models
  ↓
shared
  ↓
adapters / skills / policy-engine / config-schema
  ↓
apps / services
```

### 10.5 Labs 规则

1. `labs/` 可以引用正式代码做实验
2. 正式代码不能依赖 `labs/`
3. `labs/` 产物只能转化为正式实现，不能直接升格为正式依赖

## 11. 必须写死的架构红线

1. 不允许 `docs / Memory / labs` 进入运行时依赖链
2. 不允许 `apps` 直接 import `services` 源码
3. 不允许 `services` 互相源码耦合成长链
4. 不允许把真实运行时证据、抓取结果、交付物长期塞进 `data/`
5. 不允许把未定边界的业务逻辑持续堆进 `packages/shared`
6. 不允许绕过控制面主链，直接从 UI 或脚本发起未受控执行
7. 不允许把长期蓝图目录误写成当前待实现清单
8. 不允许先铺大量空壳目录再补实现

## 12. 首个实施子项目拆分

长期蓝图确认后，不应直接对整张蓝图开工，而应先拆出首个实施子项目：

`repo-skeleton-v1 + control-plane-minimum-slice`

### 12.1 首子项目只做 4 件事

1. 立起正式代码区骨架
2. 先把控制面最小静态中间态立住
3. 打通一个最小纵切片
4. 暂时不碰重执行层和重基础设施

### 12.2 首批骨架范围

```text
apps/control-web
apps/report-web
services/control-api
packages/contracts
packages/domain-models
packages/shared
config/{sources,policies,templates}
tests/{contract,integration,smoke}
scripts/{dev,check}
infra/{docker,local-dev}
```

### 12.3 首个最小纵切片

```text
用户在 control-web 提交一个已收口主题
  -> control-api 生成或保存最小 OpportunitySpec
  -> 编译为 TaskSpec / WorkflowSpec / ReportSpec
  -> report-web 读取 ReportSpec 并显示页面壳
```

### 12.4 首批明确不追求

1. 多 worker 真执行
2. 浏览器抓取
3. 完整 source registry
4. 复杂 scheduler
5. `ops-web`
6. `k8s / terraform`

## 13. 推荐实施顺序

1. `repo-skeleton-v1`
2. `control-plane-minimum-slice`
3. `evidence-ingestion-v1`
4. `report-render-v1`
5. `source-registry + worker-runner`
6. 再扩到 `ops-web / infra-heavy / advanced workers`

## 14. 总结

这份蓝图的核心，不是“目录画得完整”，而是同时守住 3 件事：

1. 长期目标态完整可见
2. 当前实施边界清楚
3. 目录依赖规则和架构红线足够硬

因此，OpenFons 的目录蓝图不应是“先搭一堆空目录再补实现”，而应是：

`先用长期蓝图统一方向 -> 再从蓝图中抽出最小可落地子项目 -> 再沿着主链逐步长大`
