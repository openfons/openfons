# Docker 部署 Review 与分层方案（Plan0）

> 日期：2026-03-13  
> 范围：`docs/plan/plan0/平台级重构架构与目录方案.md`、`docs/plan/plan0/平台级采集与分析架构方案（开源可商用版）.md`、`infra/docker/*`

## Review 1（文档与现状对齐）

### Findings

1. 当前 Compose 只覆盖 `crawlab-mongo`、`crawlab-master`、`pinchtab`，与 Plan0 目标基线不一致。  
2. Plan0 P0 明确要求的底座 `PostgreSQL + Valkey + SeaweedFS + Prometheus + Alertmanager` 未纳入现有默认启动链路。  
3. `services/*` 目标目录已引入，但根 workspace 仍为 `apps/* + packages/*`，与重构文档“二选一迁移”约束存在阶段性偏差。  

### 结论

现状可用于“抓取链路局部验证”，但不足以作为 Plan0 的平台化部署基线。

## Review 2（部署架构合理性）

### 结论先行

不建议“一个容器装全部服务”。建议“每个服务一个容器”，并采用分层 Compose 组合启动。

### 原因

1. 故障隔离更清晰，单点故障影响更小。  
2. 扩缩容粒度更细（例如仅扩 browser worker/airflow scheduler）。  
3. 版本升级与回滚更可控（按服务滚动，而非整包替换）。  
4. 与主流大型开源平台模式一致（web、worker、db、queue、object storage、observability 分治）。  

## 采用方案（已落地）

新增分层 Compose：

1. `infra/docker/compose.base.yml`：`PostgreSQL + Valkey + SeaweedFS`  
2. `infra/docker/compose.collect.yml`：`Crawlab + Pinchtab + Mongo`  
3. `infra/docker/compose.orchestrator.yml`：`Airflow(init/web/scheduler)`  
4. `infra/docker/compose.observability.yml`：`Prometheus + Alertmanager (+ Grafana profile)`  

最小可运行启动顺序：

1. `base + collect`  
2. 再叠加 `orchestrator`  
3. 最后叠加 `observability`  

## 运行命令（标准）

```bash
docker compose -f compose.base.yml -f compose.collect.yml up -d --build
docker compose -f compose.base.yml -f compose.collect.yml -f compose.orchestrator.yml up -d --build
docker compose -f compose.base.yml -f compose.collect.yml -f compose.orchestrator.yml -f compose.observability.yml up -d --build
```

## 下一步建议

1. 把 `worker-fetch-http/normalize/quality/publish/query-api` 的镜像与 Compose 服务补齐。  
2. 补齐 `infra/k8s` 对应清单（与 compose 同一服务边界），为后续生产部署准备。  
