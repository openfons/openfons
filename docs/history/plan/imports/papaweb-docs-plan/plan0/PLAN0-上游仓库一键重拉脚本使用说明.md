# PLAN0 上游仓库一键重拉脚本使用说明

版本：v2  
日期：2026-03-13  
脚本路径：`scripts/plan0/sync-upstreams.ps1`

## 1. 目的

基于 `manifest.tsv` 一键重拉 Plan0 依赖的上游开源仓库，并固定到指定 commit。  
该方案用于替代“把大仓库直接上传到 GitHub/LFS”。

## 2. 支持的清单格式

脚本自动兼容两种列名：

1. `repo + target_path + commit`（推荐）
2. `repo + local_path + commit`（历史临时目录）

示例清单：

1. `docs/plan/plan0/PLAN0-开源仓库下载与落位清单.tsv`
2. `tmp_plan0_upstreams/manifest.tsv`

默认清单选择规则（当未传 `-ManifestPath`）：

1. 扫描 `docs/plan/plan0/*.tsv` 与 `tmp_plan0_upstreams/*.tsv`。
2. 仅把表头包含 `component/repo/commit + (target_path|local_path)` 的文件当作候选。
3. 优先选择含 `target_path` 的清单；若有多个候选，脚本会输出候选列表与最终选择结果。

可选覆盖方式：

1. 命令行：`-ManifestPath "<path>"`
2. 环境变量：`PLAN0_MANIFEST_PATH`

## 3. 使用前提

1. 已安装 Git，并且 `git` 在 PATH 中可用。
2. 在仓库根目录执行脚本：`D:\demo1\papaweb`

## 4. 常用命令

先做规划预览（不落盘）：

```powershell
cd D:\demo1\papaweb
.\scripts\plan0\sync-upstreams.ps1 -DryRun
```

按默认自动发现清单重拉（默认只处理 `status=ready`）：

```powershell
.\scripts\plan0\sync-upstreams.ps1
```

显式指定清单路径（可选）：

```powershell
.\scripts\plan0\sync-upstreams.ps1 `
  -ManifestPath "docs/plan/plan0/PLAN0-开源仓库下载与落位清单.tsv"
```

仅同步指定组件：

```powershell
.\scripts\plan0\sync-upstreams.ps1 `
  -Components Airflow,Crawlab,Pinchtab
```

限制条数（调试用）：

```powershell
.\scripts\plan0\sync-upstreams.ps1 -DryRun -Limit 3
```

通过环境变量指定清单（可选）：

```powershell
$env:PLAN0_MANIFEST_PATH = "tmp_plan0_upstreams/manifest.tsv"
.\scripts\plan0\sync-upstreams.ps1 -DryRun -Limit 2
Remove-Item Env:PLAN0_MANIFEST_PATH
```

## 5. 安全策略

脚本默认启用以下安全规则：

1. 只允许写入当前仓库工作区路径内（防止误写到仓库外）。
2. 若目标仓库工作区存在未提交改动（dirty），默认报错并跳过，不覆盖本地修改。
3. 若目标仓库 `origin` 与清单 `repo` 不一致，报错并跳过。

## 6. 失败排查

常见错误与处理：

1. `origin mismatch`：目标目录不是预期上游仓库，检查目录来源。
2. `working tree is dirty`：先处理本地改动，再重试。
3. `fetch ... failed`：网络问题或 commit 不存在，检查清单 commit 是否有效。

## 7. 推荐协作方式

1. Git 仓库中保留清单文件与脚本。
2. 上游大仓库按需本地重拉，不进入仓库历史。
3. 团队统一通过同一清单和脚本复现依赖版本。
