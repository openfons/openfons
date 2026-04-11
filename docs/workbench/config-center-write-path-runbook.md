# Config Center Write Path Runbook

## 适用范围

本 runbook 只覆盖 `control-api` 提供的配置中心写路径：

- 插件实例：`/api/v1/config/plugins/:pluginId`
- 项目绑定：`/api/v1/config/projects/:projectId/bindings`

本批次只允许写入 repo-visible config：

- `config/plugins/**`
- `config/projects/**`

真实 secret value 仍然保留在 `~/.openfons/secrets/**`，写入 body 时只能保留 `SecretRef`，不能把明文 secret 写进仓库配置文件。

## 先读当前 revision

任何写入前，先读取当前对象和 `revision.etag`。后续 `PUT` 要把它带回去做 optimistic concurrency。

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

## 预览插件写入

先基于当前返回体构造新 body，再走 `?dryRun=true`。这样可以确保 body 结构和服务端当前 contract 一致。

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
- `revision` 是写入后的预计 revision
- `validation` 是写前校验结果
- 不会改动仓库文件

如果插件校验依赖某个具体项目上下文，插件写接口可以显式带 `projectId`：

```powershell
http://localhost:3002/api/v1/config/plugins/google-default?projectId=openfons&dryRun=true
```

## 正式应用插件写入

正式应用时，body 保持不变，只去掉 `?dryRun=true`。

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

## 预览项目绑定写入

```powershell
$binding = $bindingDetail.binding

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

如果要修改内容，先改 `$binding`，再重新生成 `$bindingBody` 后执行预览。

## 正式应用项目绑定写入

```powershell
$bindingApply = Invoke-RestMethod `
  -Method Put `
  -Uri http://localhost:3002/api/v1/config/projects/openfons/bindings `
  -ContentType 'application/json' `
  -Body $bindingBody

$bindingApply
```

## 常见失败信号

- `409 revision-conflict`：你手里的 `expectedRevision` 过期了，需要先重新 `GET`
- `423 lock-unavailable`：另一个写操作正在进行，稍后重试
- `400 invalid-config`：写前校验没通过，先修正 body 再试

## 回滚坏写入

每次成功写入都会在返回体里带上 `backupFile`。回滚时按这个路径恢复，而不是手工猜文件名。

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

如果本次变更影响 crawler 或 browser 路由，再补对应 route preflight：

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3002/api/v1/config/projects/openfons/routes/<routeKey>/preflight
```

## 操作边界

- 不要把 API key、cookie、account 明文、proxy 明文直接写进 repo-visible config
- 只修改当前目标资源，不扩展成“任意文件写入”
- 永远先 `GET` 拿 revision，再 `dryRun`，最后才 `apply`
