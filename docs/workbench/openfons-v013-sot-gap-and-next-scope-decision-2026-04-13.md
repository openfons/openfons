# OpenFons v013 SoT Gap And Next-Scope Decision

> 文档定位：`v013` 工作台决策文档，用于指导 `docs/sot/**` 同步与下一主线判断，不替代正式 SoT。  
> 生成日期：2026-04-13  
> 绑定目标：`goal_v013_20260413.md`

## 一句话结论

`docs/sot/**` 当前最大问题不是方向错误，而是时间点过早，仍停留在 `2026-03-29` 左右的阶段口径，没有把 `v009-v012` 已经落地的 `artifact delivery`、`config-center` 与 `operator closure` 写进总纲。

因此，`v013` 的合理动作不是继续补新代码，而是先把 SoT 同步到当前真实状态，再基于统一口径决定下一条主线。

## 当前真实状态

截至 2026-04-13，OpenFons 当前更准确的状态是：

1. 已完成最小控制面与交付面闭环：
   - `apps/control-web`
   - `services/control-api`
   - `apps/report-web`
2. 已完成 `AI procurement` 单案例的 file-backed artifact delivery：
   - compile 成功后会生成 repo-relative `report.html`
   - `CompilationResult.artifacts` 已不再停留在纯内存态
3. 已完成 `platform plugin config center` 的平台底座收口：
   - `read`
   - `write`
   - `revision / lock / backup`
   - `project doctor / readiness`
   - `backup history`
   - operator runbook 与 acceptance checklist
4. `search-gateway`、browser runtime 与 crawler route resolution 已接入 `config-center`
5. 真实 `youtube / tiktok` smoke 仍未正式收尾：
   - 缺真实 `yt-dlp`
   - 缺真实 secret / cookie / account / proxy 等外部材料
   - 当前 blocker 更接近“外部条件未满足”，而不是“仓库里没有这段代码”

## SoT 主要偏差

### 1. 架构 SoT 停留在早期最小闭环

`docs/sot/开放源平台当前正式架构说明.md` 仍把当前已证明的闭环写成：

`OpportunityInput -> OpportunitySpec -> TaskSpec / WorkflowSpec -> ReportSpec -> report-web artifact shell`

这个表述已经过时。当前至少还应补上：

1. `CompilationResult.artifacts` 已是 file-backed
2. `config-center` 已形成 repo-visible config + local secret + operator API 的运营化闭环
3. `services/search-gateway` 和 `packages/config-center` 已进入正式工程结构
4. 当前最大未收尾项是 external runtime smoke，而不是配置中心

### 2. 技术团队 SoT 把历史选型写成当前正式依赖

`docs/sot/开放源平台技术团队说明.md` 里把 `Airflow` 写成“当前唯一编排真源”，这与当前仓库现实不一致。

更准确的说法应该是：

1. 当前仓库还没有把 `Airflow` 或 `Temporal` 落成已合并代码依赖
2. 二者目前都属于历史方案或未来候选，而不是当前运行时前提
3. 真正已经进入仓库主线的，是：
   - TypeScript / Node.js / pnpm
   - React / Vite / TanStack Router
   - Hono / Zod / Vitest
   - `packages/config-center`
   - `packages/search-gateway`
   - `services/search-gateway`

### 3. 投资人口径仍停留在 bootstrap 早期

`docs/sot/开放源平台投资人说明.md` 仍强调“Greenfield Bootstrap / 架构与核心契约建设期”，这对外不算错，但对当前阶段描述明显偏早。

更公允的说法应该是：

1. 仍未形成成熟商用产品
2. 但已经完成一批关键平台底座：
   - 单案例 artifact delivery
   - config-center 读写与 operator closure
   - search / browser / crawler 路由接入
3. 当前真正阻塞商业化执行证明的，是外部 runtime 条件，而不是平台底座完全缺失

### 4. SoT 没把 external-blocked 边界写清楚

当前 SoT 缺少一句很关键的话：

`真实外部执行闭环仍受外部材料约束，当前 blocker 不应被误读为平台核心代码未完成。`

没有这句，后续很容易反复误判“是不是应该继续写 crawler 代码”。

## v013 应怎么改

`v013` 应完成四件事：

1. 更新 `docs/sot/README.md`
   - 说明 SoT 已同步至 `v010-v012` 之后的真实状态
   - 补充与 `docs/workbench/openfons-v001-v012-evolution-summary.md` 的关系
2. 更新 `docs/sot/开放源平台当前正式架构说明.md`
   - 把最小闭环描述升级到包含 file-backed artifact 与 config-center closure 的阶段
   - 补充当前服务/包/配置目录真实结构
   - 明确 external-blocked 边界
3. 更新 `docs/sot/开放源平台技术团队说明.md`
   - 把“当前已合并工程依赖”和“历史方案 / 候选方案”拆开
   - 移除 `Airflow = 当前唯一编排真源` 这种过强表述
4. 更新 `docs/sot/开放源平台投资人说明.md`
   - 把项目阶段从“早期 bootstrap”校正为“平台底座初步成型，但真实外部执行仍未完全收尾”

## 对 v014 的推荐判断

### 推荐顺序

如果外部条件仍然拿不到，`v014` 最合理的推荐方向不是继续扩写配置中心，也不是盲目扩大 crawler adapter，而是：

`retrieval orchestration and source readiness decision`

更具体地说，是把下面这些边界收口成下一条主线候选：

1. `search-gateway` 如何从“provider route + validation”升级到更接近研究平台的 retrieval orchestration
2. `SourceReadiness / RouteReadiness` 如何进入正式契约，而不只停留在口头诊断
3. `EvidenceSet` 如何承接更真实的 source-native 检索与降级结果

### 条件分支

如果用户后续能提供：

1. 真实 secret
2. 可用 `yt-dlp`
3. 真实 cookie / account / proxy / token

那么优先级可以临时反转，先回到：

`external smoke closure`

因为那时能直接验证“平台能不能真实采集”，其证据价值会高于继续补内部结构。

## 公允判断

`v013` 不是“停下来写文档”，而是在已经补完一大段平台底座后，避免继续带着过期总纲误判下一步。

如果不先做这一轮 SoT 同步，后续无论是回到 external smoke，还是定义 retrieval / Evidence / Artifact 相关主线，都会反复发生这三类问题：

1. 把历史候选方案误读成当前事实
2. 把已完成的平台底座误判成“还没开始”
3. 把外部条件 blocker 误判成内部代码缺口

因此，`v013` 的价值在于：

1. 统一当前口径
2. 收口真实阶段
3. 为 `v014` 做干净切换
