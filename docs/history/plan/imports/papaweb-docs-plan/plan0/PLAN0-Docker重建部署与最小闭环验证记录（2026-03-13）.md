# PLAN0 Docker重建部署与最小闭环验证记录（2026-03-13）

日期：2026-03-13  
执行人：Codex（协作记录）  
环境：`D:\demo1\papaweb`（Windows + Docker Compose）

## 1. 本次目标

1. 按 Stage D 方案执行 Docker 重建部署（含 build）。
2. 执行标准健康检查，确认核心服务可用。
3. 执行平台最小闭环烟测（seed -> pipeline -> publish -> query）。
4. 触发 Airflow DAG 并确认 run 成功。

## 2. 执行命令与结果

### 2.1 重建部署

执行命令：

```powershell
.\infra\docker\start.ps1 -Stage D -WithGrafana $true -Build
```

结果：

1. Stage D 所需镜像完成构建/复用。
2. 相关容器完成重建与拉起。
3. `docker compose ls` 显示项目 `papaweb` 为 `running(19)`。

### 2.2 健康检查

执行命令：

```powershell
.\infra\docker\healthcheck.ps1 -Stage D -WithGrafana $true
```

结果：

1. 输出 `Healthcheck PASSED`。
2. 关键服务状态通过：
   - `postgres`、`valkey`、`query-api` healthy
   - `crawlab-master`、`pinchtab`、`airflow-webserver`、`airflow-scheduler`、`prometheus`、`alertmanager`、`grafana` running
3. 关键 HTTP 检查通过（均返回 200）：
   - Crawlab：`http://127.0.0.1:18080`
   - Pinchtab health：`http://127.0.0.1:19867/health?token=<PINCHTAB_TOKEN>`
   - SeaweedFS filer：`http://127.0.0.1:18888`
   - Airflow health：`http://127.0.0.1:18081/health`
   - Prometheus ready：`http://127.0.0.1:19090/-/ready`
   - Alertmanager ready：`http://127.0.0.1:19093/-/ready`
   - Grafana health：`http://127.0.0.1:13000/api/health`
   - Query API health：`http://127.0.0.1:18787/healthz`
   - Query API metrics：`http://127.0.0.1:18787/api/v1/metrics`

### 2.3 平台最小闭环烟测（Query API触发）

执行命令：

```powershell
.\infra\docker\platform-smoke.ps1 -TimeoutSec 300 -MinPublished 1
```

结果：

1. 输出 `Platform smoke check PASSED`。
2. 触发成功：`job_d2a92954-4806-4be5-974b-05880c35dfd2`，`seedCount=3`。
3. 运行时指标（脚本输出）：
   - `total=78`
   - `published=45`
4. `tools` 查询返回有效数据（示例包含 Futurepedia / Toolify / AI导航网）。

### 2.4 Airflow DAG 实际触发验证

执行动作：

1. 触发 DAG：`papaweb_platform_seed_pipeline`
2. 指定 run_id：`manual_codex_20260313110808`
3. 轮询 run 状态：`queued -> running -> success`

结果：

1. 本次 DAG run 成功（`success`）。
2. 随后 Query API 指标继续增长并可读：
   - `metrics.totalTasks=81`
   - `metrics.publishedTasks=51`
   - `/api/v1/tools?limit=3` 返回 3 条数据

## 3. 验收结论

本次 Stage D 重建部署与最小闭环验证通过，判定如下：

1. Compose 分层部署可正常重建并启动。
2. 核心服务健康检查全部通过。
3. 最小闭环链路可执行且产出可被 Query API 查询。
4. Airflow 编排触发路径可用并可稳定完成一次 run。

## 4. 备注

1. 当前仓库工作区在本次验证结束后为干净状态（`git status` 无未提交改动）。
2. 该记录用于团队对齐“已验证能力”，不替代生产发布审批流程。
