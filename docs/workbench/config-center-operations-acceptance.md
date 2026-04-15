# Config Center Operations Acceptance

## 目标

确认 `v012` 已经把平台级配置中心从“可以读写”推进到“可诊断、可审计、可回滚、可验收”的状态，而且不扩大到 UI、secret 明文写入或新 runtime 功能。

## 必过场景

1. 缺失 project 时，`bindings / validate / resolve / preflight / doctor` 都返回结构化 `404 not-found`。
2. 非法 JSON 或不合法请求体返回结构化 `400 invalid-request`。
3. 写前校验失败返回结构化 `400 invalid-config`。
4. `expectedRevision` 过期时返回结构化 `409 revision-conflict`。
5. 并发写锁冲突时返回结构化 `423 lock-unavailable`。
6. `GET /api/v1/config/projects/:projectId/doctor` 能区分 `ready / degraded / blocked`。
7. 成功 `apply` 后可通过 `GET /api/v1/config/backups` 查询到 backup history entry。
8. `dryRun` 不写入 backup history，no-op apply 也不写入 backup history。
9. 按 runbook 回滚后，`validate` 和 `doctor` 恢复到预期状态。

## 验收步骤

### 1. 错误契约验收

执行并确认以下场景：

- 访问不存在的 `project binding`
- 提交非法 JSON
- 提交不符合 schema 的写请求
- 提交过期 revision
- 构造 lock 冲突

验收标准：

- 返回体都包含统一字段：`error`、`message`、`resource`、`resourceId`、`projectId`、`routeKey`、`retryable`
- 不再混用裸字符串错误和非结构化 `500`

### 2. Doctor 面验收

执行：

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3002/api/v1/config/projects/openfons/doctor
```

验收标准：

- 能看到 `bindingRevision`
- 能看到 `validation`
- 能看到每条 route 的 `status`、`mode`、`reason`
- 能看到 `writePath.configWritable`、`writePath.lockDirReady`、`writePath.backupDirReady`

### 3. Backup History 面验收

按 runbook 完成一次完整链路：

1. `GET` 当前资源
2. `dryRun`
3. 正式 `apply`
4. 查询 `doctor`
5. 查询 `backups`

执行：

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3002/api/v1/config/backups?projectId=openfons"
```

验收标准：

- 至少能看到刚刚成功 apply 的 entry
- entry 含有 `backupFile`
- entry 含有 `revision`
- 修改已有资源时，entry 含有 `previousRevision`

### 4. 回滚验收

使用最近一次 apply 返回的 `backupFile` 恢复目标文件后，重新执行：

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3002/api/v1/config/projects/openfons/validate
```

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3002/api/v1/config/projects/openfons/doctor
```

验收标准：

- `validate` 恢复到预期结果
- `doctor.status` 恢复到预期结果
- 若变更影响 route，`preflight` 结果也恢复正常

## 自动验证证据

当前代码级验收至少应包含以下命令：

```powershell
pnpm exec vitest run `
  tests/integration/control-api-config-center-acceptance.test.ts `
  tests/contract/config-center-ops-schema.test.ts `
  tests/integration/control-api-config-center-ops.test.ts `
  tests/integration/config-center-doctor.test.ts `
  tests/integration/control-api-config-center-doctor.test.ts `
  tests/integration/control-api-config-center-backups.test.ts `
  tests/integration/control-api-config-center.test.ts `
  tests/integration/control-api-config-center-write.test.ts
```

其中 `tests/integration/control-api-config-center-acceptance.test.ts` 应覆盖一条完整 operator 闭环：

1. 读取当前 binding 与 revision
2. 执行 `dryRun`
3. 验证 `dryRun` 不写入 backup history
4. 验证 no-op `apply` 不写入 backup history
5. 执行真实 `apply`
6. 查询 `doctor` 与 `backups`
7. 用 `backupFile` 回滚
8. 重新执行 `validate` 与 `doctor`

```powershell
pnpm typecheck
```

```powershell
git diff --check
```

## 通过结论

只有当下面四件事同时成立时，`v012` 才算通过：

1. 统一 operator error contract 已落地并经测试覆盖。
2. `doctor` 面可供 operator 直接诊断项目 readiness。
3. backup / revision / rollback 线索可被后续读取和核对，而不只停留在单次写响应里。
4. runbook 和 acceptance checklist 足以支撑一次完整的“读 revision -> dryRun -> apply -> doctor -> rollback -> 再校验”闭环。
