# Config Center Write Path Runbook

## 适用范围

本 runbook 只覆盖 `control-api` 提供的配置中心写路径：

- 插件实例：`/api/v1/config/plugins/:pluginId`
- 项目绑定：`/api/v1/config/projects/:projectId/bindings`

本批次只允许写入 repo-visible config：

- `config/plugins/**`
- `config/projects/**`

真实 secret value 继续保留在 `~/.openfons/secrets/**`。写入 body 里只能保留 `SecretRef`，不能把 API key、cookie、account、proxy 明文写进仓库配置文件。

## 操作原则

始终按下面顺序执行：

1. `GET` 读取当前对象和 `revision.etag`
2. `PUT ?dryRun=true` 做预演
3. 去掉 `dryRun` 做正式 `apply`
4. 读取 `doctor` 和 `backup history`
5. 如需恢复，优先使用本次写入返回的 `backupFile`
6. 回滚后重新执行 `validate` 和 `doctor`

## 先读当前 revision

任何写入前，先读取目标对象和当前 `revision.etag`。后续 `PUT` 必须带回 `expectedRevision`，用于 optimistic concurrency。

### 读取插件实例

```powershell
$pluginDetail = Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3002/api/v1/config/plugins/google-default

$pluginDetail.revision
$pluginDetail.plugin
```

### 读取项目绑定

```powershell
$bindingDetail = Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3002/api/v1/config/projects/openfons/bindings

$bindingDetail.revision
$bindingDetail.binding
```

## 预演插件写入

先基于当前返回体构造新 body，再走 `?dryRun=true`。这样可以确认 body 结构、校验结果和预期 revision 都正确，而且不会落盘。

```powershell
$plugin = $pluginDetail.plugin
$plugin.config.endpoint = "https://example.com/custom"

$pluginBody = @{
  expectedRevision = $pluginDetail.revision.etag
  plugin = $plugin
} | ConvertTo-Json -Depth 12

$pluginPreview = Invoke-RestMethod `
  -Method Put `
  -Uri http://localhost:3002/api/v1/config/plugins/google-default?dryRun=true `
  -ContentType 'application/json' `
  -Body $pluginBody

$pluginPreview
```

预期结果：

- `status = "dry-run"`
- `changed` 表示是否真的会改文件
- `revision` 是写入后的预期 revision
- `validation` 是写前校验结果
- 不会改动仓库文件

如插件校验依赖具体项目上下文，可显式带 `projectId`：

```powershell
http://localhost:3002/api/v1/config/plugins/google-default?projectId=openfons&dryRun=true
```

## 正式应用插件写入

正式 apply 时，body 保持不变，只去掉 `?dryRun=true`。

```powershell
$pluginApply = Invoke-RestMethod `
  -Method Put `
  -Uri http://localhost:3002/api/v1/config/plugins/google-default `
  -ContentType 'application/json' `
  -Body $pluginBody

$pluginApply
```

预期结果：

- `status = "applied"`
- `backupFile` 指向本次写入前保存的备份文件
- `revision` 是新文件 revision

## 预演项目绑定写入

```powershell
$binding = $bindingDetail.binding
$binding.overrides = @{
  doctorMarker = "v012"
}

$bindingBody = @{
  expectedRevision = $bindingDetail.revision.etag
  binding = $binding
} | ConvertTo-Json -Depth 12

$bindingPreview = Invoke-RestMethod `
  -Method Put `
  -Uri http://localhost:3002/api/v1/config/projects/openfons/bindings?dryRun=true `
  -ContentType 'application/json' `
  -Body $bindingBody

$bindingPreview
```

如需修改更多内容，先改 `$binding`，再重新生成 `$bindingBody` 后执行预演。

## 正式应用项目绑定写入

```powershell
$bindingApply = Invoke-RestMethod `
  -Method Put `
  -Uri http://localhost:3002/api/v1/config/projects/openfons/bindings `
  -ContentType 'application/json' `
  -Body $bindingBody

$bindingApply
```

## 查询 project doctor

正式 apply 后，优先查看项目级诊断面，确认 validation、route readiness 和 write path readiness 是否仍然符合预期。

```powershell
$doctor = Invoke-RestMethod `
  -Method Get `
  -Uri http://localhost:3002/api/v1/config/projects/openfons/doctor

$doctor
```

关注字段：

- `status`: `ready | degraded | blocked`
- `bindingRevision`
- `validation.status`
- `routes[].status`
- `writePath.configWritable`
- `writePath.lockDirReady`
- `writePath.backupDirReady`

## 查询 backup history

`backup history` 是 apply 后的可追踪面，不记录 dry-run，也不记录 no-op。

### 按项目查询

```powershell
$projectBackups = Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3002/api/v1/config/backups?projectId=openfons"

$projectBackups.entries
```

### 按资源类型和资源 ID 查询

```powershell
$pluginBackups = Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3002/api/v1/config/backups?resource=plugin-instance&resourceId=google-default"

$pluginBackups.entries
```

当前支持过滤参数：

- `resource`
- `resourceId`
- `projectId`

每条 entry 重点关注：

- `resource`
- `resourceId`
- `projectId`
- `createdAt`
- `backupFile`
- `revision`
- `previousRevision`

## apply 后的推荐校对顺序

1. 重新读取目标资源，确认新的 `revision.etag`
2. 查询 `GET /api/v1/config/projects/:projectId/doctor`
3. 查询 `GET /api/v1/config/backups`
4. 如变更影响 crawler route，再跑对应 `preflight`
5. 如需要恢复，直接使用 `backup history` 或 apply 响应中的 `backupFile`

## 回滚坏写入

每次成功 apply 都会返回 `backupFile`，同时也会写入 `backup history`。回滚时优先使用这些路径，而不是手工猜文件名。

### 回滚插件实例

目标文件：

```text
config/plugins/instances/google-default.json
```

恢复命令：

```powershell
Copy-Item `
  -LiteralPath $pluginApply.backupFile `
  -Destination (Join-Path (Get-Location) 'config/plugins/instances/google-default.json') `
  -Force
```

### 回滚项目绑定

目标文件：

```text
config/projects/openfons/plugins/bindings.json
```

恢复命令：

```powershell
Copy-Item `
  -LiteralPath $bindingApply.backupFile `
  -Destination (Join-Path (Get-Location) 'config/projects/openfons/plugins/bindings.json') `
  -Force
```

## 回滚或写入后的校验

至少执行下面两类校验：

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

如果本次变更影响 crawler 或 browser 路由，再补对应 route preflight：

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3002/api/v1/config/projects/openfons/routes/<routeKey>/preflight
```

## 常见失败信号

- `404 not-found`：目标 project、binding、route 或 plugin 不存在
- `400 invalid-request`：JSON 非法或 body 不符合 contract
- `400 invalid-config`：写前校验未通过
- `409 revision-conflict`：手里的 `expectedRevision` 已过期，需要重新 `GET`
- `423 lock-unavailable`：另一个写操作正在进行，稍后重试
- `500 config-write-failed`：底层写入失败，需要结合报错和 `backupFile` 排查

## 操作边界

- 不要把 API key、cookie、account、proxy 明文直接写进 repo-visible config
- 只修改当前目标资源，不扩展成“任意文件写入”
- 只通过 `control-api` 暴露的配置中心路径做运营操作
- 永远先 `GET` 拿 `revision`，再 `dryRun`，最后才 `apply`
