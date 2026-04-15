# Config Center Current Status And Boundaries - 2026-04-14

## One-Sentence Conclusion

OpenFons 配置中心主线已经不再是“待实现设计”，而是内部代码链路基本闭环；当前更大的剩余问题是缺少真实 operator-managed 外部条件来完成最终 acceptance，而不是缺少新的内部抽象层。

## What Was Rechecked On 2026-04-14

本次重新回到配置中心主线后，复核了以下材料：

- 设计：
  - `docs/superpowers/specs/2026-04-07-platform-plugin-config-center-design.md`
  - `docs/superpowers/specs/2026-04-11-config-center-operational-closure-design.md`
- 计划：
  - `docs/superpowers/plans/2026-04-07-platform-plugin-config-center.md`
  - `docs/superpowers/plans/2026-04-11-config-center-operational-closure.md`
- 运行与验收文档：
  - `docs/workbench/config-center-write-path-runbook.md`
  - `docs/workbench/config-center-operations-acceptance.md`
- 当前实现入口：
  - `packages/config-center/**`
  - `packages/contracts/src/config-center*.ts`
  - `services/control-api/src/config-center/**`
  - `services/control-api/src/collection/search-client.ts`
  - `services/control-api/src/collection/authenticated-local-browser/runtime.ts`
  - `services/control-api/src/collection/crawler-adapters/**`

## Current Internal Closure

从代码结构和当前测试覆盖看，配置中心内部已经覆盖了以下能力：

### 1. Shared Contracts

已经存在：

- `config-center` contracts
- `config-center-write` contracts
- `config-center-ops` contracts

这意味着配置中心已经不只是“读路径 schema”，还包括：

- plugin / project binding 合同
- write-path request / result 合同
- operator-facing error / doctor / backup history 合同

### 2. Shared Config-Center Core

`packages/config-center` 已经具备：

- repo-visible config loader
- local secret-store 解析
- masking
- validator
- resolver
- doctor
- readiness
- atomic write / revision / lock / backup / backup-history

这说明配置中心已经从单纯 read-path 走到了：

- read
- validate
- resolve
- write
- operator diagnostics
- rollback evidence

### 3. `control-api` Management Surface

`services/control-api/src/config-center/router.ts` 已经暴露并测试了：

- plugin-types
- plugins
- project bindings
- validate
- resolve
- write
- doctor
- backups

并且已具备统一的 operator-facing error contract，而不只是零散的 route-local 错误处理。

### 4. Runtime Integration

当前配置中心不只是“管理面存在”，还已经接入了真实 runtime 消费侧：

- search runtime 通过配置中心解析 provider
- authenticated local browser runtime 通过配置中心解析 browser route
- crawler adapter registry 通过配置中心解析 collection / browser / account / cookie / proxy route dependencies

这点很关键，因为它说明配置中心已经不只是一个后台配置目录，而是开始成为真实 runtime 的输入层。

## Rechecked Verification Evidence

2026-04-14 重新执行了以下验证：

```powershell
pnpm exec vitest run `
  tests/contract/config-center-schema.test.ts `
  tests/contract/config-center-write-schema.test.ts `
  tests/contract/config-center-ops-schema.test.ts `
  tests/integration/config-center-loader.test.ts `
  tests/integration/config-center-resolver.test.ts `
  tests/integration/config-center-write.test.ts `
  tests/integration/config-center-doctor.test.ts `
  tests/integration/control-api-config-center.test.ts `
  tests/integration/control-api-config-center-write.test.ts `
  tests/integration/control-api-config-center-ops.test.ts `
  tests/integration/control-api-config-center-doctor.test.ts `
  tests/integration/control-api-config-center-backups.test.ts `
  tests/integration/crawler-adapter-config-center.test.ts
```

结果：

- 13 个测试文件全部通过
- 23 个测试全部通过

同时执行：

```powershell
pnpm typecheck
```

结果：

- workspace `typecheck` 通过

## Fair Judgment

公允判断如下：

### 可以认定已经内部完成的部分

- 配置中心内部代码主线已经不是“空计划”
- `read / validate / resolve / write / doctor / backups / runtime bridge` 这些批次已经进入代码
- 这些能力不是只在文档里，而是有 contract / integration test 证明

### 不能夸大为“完全闭环”的部分

还不能把配置中心说成“全局运营闭环已经正式完成”，原因不是内部代码缺失，而是最终 acceptance 仍依赖真实外部材料：

- `yt-dlp` 可执行文件
- 真实 `pinchtab-token`
- 真实 cookie 文件
- 真实 account 文件
- 真实 proxy 池
- 真实 operator-managed secret 目录内容

换句话说：

- 内部平台能力大体已到位
- 真正的最终闭环还差“真实运行环境与真实运营材料”

## What Is Still Not Proven End-To-End

尽管内部测试已通过，下面这些内容仍不能仅凭当前仓库内测试就宣称已经完成：

### 1. Real External Operator Acceptance

`docs/workbench/config-center-operations-acceptance.md` 定义了 operator acceptance，但这更多是：

- 验收脚本
- 验收标准
- 本地与临时 fixture 下的自动测试证据

它还不等于：

- 在真实本机 secret 目录下完成一轮正式 operator acceptance

### 2. Real Route Runtime Acceptance

Crawler / browser / account / cookie / proxy 的 route resolution 已经在代码内闭环，但真实 route smoke 仍受外部条件限制。

因此不能把下面两件事混成一件：

1. `config-center` 已经能把 route runtime 正确解析出来
2. 真实目标 route 已经 smoke 成功

现在第 1 条基本成立，第 2 条仍受 external-blocked 条件影响。

### 3. Production-Like Secret Hygiene

当前模型下：

- repo-visible config 与 local private secrets 已分离
- write-path 不会把 secret 明文写回 repo

但真实 operator 流程是否稳定，还需要在真实 secret 材料存在的前提下完成一次正式 acceptance。

## The Real Remaining Work

从今天的复核看，配置中心主线真正剩下的工作已经收窄为两类：

### A. Real Acceptance Work

在真实外部条件具备时，按 runbook 和 acceptance checklist 做一次完整闭环：

1. 读取 revision
2. `dryRun`
3. `apply`
4. 查询 `doctor`
5. 查询 `backups`
6. 如有需要执行 rollback
7. 再次 `validate` 与 `doctor`
8. 针对真实 route 做外部 runtime smoke

### B. Documentation / Boundary Maintenance

在真实外部条件暂时不可得时，合理的动作不是继续往配置中心里加新功能，而是：

- 维护状态文档
- 维护验收脚本
- 保持“内部已完成”和“外部仍阻塞”的边界清晰

## What Not To Do Next

如果没有新的真实外部条件，本阶段不建议继续做下面这些事：

- 不要再新增配置中心 UI
- 不要再新增 secret 明文写入接口
- 不要为了“显得在推进”再加新的 plugin type 或 driver family
- 不要把 external runtime blocked 错判成配置中心内部代码还没做完
- 不要重新打开一轮平台级大重构

## Recommended Next Step

当前最合理的下一步是按外部条件分流：

### 如果真实外部条件已具备

直接进入：

- 真实 operator acceptance
- 真实 runtime / smoke acceptance

### 如果真实外部条件暂时还不具备

当前主线就应保持为：

`internal-complete, external-blocked`

此时只做：

- 状态维护
- 验收准备
- 等待真实条件补齐后重入

## Final Status Label

最准确的状态标签应当是：

`config-center internal-closure complete; final operator/runtime acceptance still depends on real external materials`
