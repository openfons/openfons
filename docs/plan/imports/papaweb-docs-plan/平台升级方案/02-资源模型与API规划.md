# 资源模型与 API 规划

## 1. 为什么现有 API 不够

目前你们提到的这些 API 方向是对的：

- 任务模板 API
- 三层策略配置 API
- 任务取消 / 重试 API
- 运行进度明细 API
- 用户级参数保存 API
- 审计日志 API
- 权限控制 API

但如果只补这些，平台仍然是不完整的。

还必须补上：

- 一级 `run` 对象 API
- 来源站点完整配置 API
- 清洗规则 API
- 导出任务 API
- 原始证据与产物 API
- 系统运维 API

否则前端能做出页面，但做不成真正的平台。

## 2. 资源模型规划

平台接口不建议继续只围绕“几个列表接口”展开，而应该围绕资源对象展开。

### 2.1 Run

建议把 `run` 升级为一级资源对象。

原因：

- 现在 `run_id` 只是散落在多张表上的字符串
- 不利于做任务中心、运行历史、取消、重试、审计追踪

建议新增表：

- `pipeline_runs`

建议字段：

- `id`
- `template_id`
- `schedule_id`
- `strategy_profile_id`
- `quality_policy_version`
- `clean_rule_set_id`
- `requested_by`
- `workspace_id`
- `status`
- `reason`
- `run_label`
- `input`
- `summary`
- `started_at`
- `completed_at`
- `created_at`
- `updated_at`

### 2.2 Job / Task / Event / Artifact

保留现有：

- `crawl_jobs`
- `crawl_tasks`
- `pipeline_events`

但要把它们统一挂到 `run` 之下。

建议新增：

- `task_artifacts`

用于记录：

- 原始 HTML
- 截图
- 原始响应
- 下载日志
- Pinchtab 输出
- 清洗前后对比文件

### 2.3 Template

建议新增：

- `task_templates`

模板建议保存：

- 来源站点集合
- 执行模式
- 三层策略 profile
- 采集数量目标
- discovery 限制
- 质量策略
- 清洗规则
- 导出偏好

### 2.4 Schedule

建议新增：

- `task_schedules`

### 2.5 Strategy Profile

建议新增：

- `strategy_profiles`
- `strategy_profile_steps`

目标是把现有 `aggressive / conservative / fallback` 从脚本定义迁移为平台数据模型。

### 2.6 Clean Rule Set

建议新增：

- `clean_rule_sets`
- `clean_rule_versions`

用于承载“前端用户配置清洗逻辑”的能力。

### 2.7 Auth / RBAC / Audit

建议新增：

- `users`
- `roles`
- `permissions`
- `user_role_bindings`
- `audit_logs`

### 2.8 Export

建议新增：

- `export_jobs`

### 2.9 User Preferences

建议新增：

- `user_preferences`
- `saved_views`

用于保存：

- 表格列配置
- 默认筛选器
- 默认来源组合
- 默认任务参数

## 3. API 分层建议

建议保留现有 `/api/v1/*` 兼容链路，同时新增 `/api/v2/*` 作为平台正式接口层。

## 4. `/api/v2/*` 规划

### 4.1 Run API

建议接口：

- `POST /api/v2/runs`
- `GET /api/v2/runs`
- `GET /api/v2/runs/:id`
- `POST /api/v2/runs/:id/cancel`
- `POST /api/v2/runs/:id/retry`
- `POST /api/v2/runs/:id/clone`
- `GET /api/v2/runs/:id/timeline`
- `GET /api/v2/runs/:id/summary`

说明：

- `POST /api/v2/runs` 应替代用户直接碰 `/api/v1/pipeline/seed-run`
- “新建任务页”最终应提交平台级参数，而不是只传底层字段

### 4.2 Job / Task API

建议接口：

- `GET /api/v2/jobs`
- `GET /api/v2/jobs/:id`
- `GET /api/v2/tasks`
- `GET /api/v2/tasks/:id`
- `POST /api/v2/tasks/:id/retry`
- `POST /api/v2/tasks/:id/cancel`
- `GET /api/v2/tasks/:id/events`
- `GET /api/v2/tasks/:id/artifacts`

作用：

- 支撑错误定位
- 支撑原始证据查看
- 支撑单任务重试
- 支撑失败链路追踪

### 4.3 Task Template API

建议接口：

- `POST /api/v2/task-templates`
- `GET /api/v2/task-templates`
- `GET /api/v2/task-templates/:id`
- `PATCH /api/v2/task-templates/:id`
- `POST /api/v2/task-templates/:id/run`

### 4.4 Schedule API

建议接口：

- `POST /api/v2/schedules`
- `GET /api/v2/schedules`
- `GET /api/v2/schedules/:id`
- `PATCH /api/v2/schedules/:id`
- `POST /api/v2/schedules/:id/pause`
- `POST /api/v2/schedules/:id/resume`
- `POST /api/v2/schedules/:id/trigger`

### 4.5 Source Site API

建议接口：

- `GET /api/v2/source-sites`
- `GET /api/v2/source-sites/:id`
- `POST /api/v2/source-sites`
- `PATCH /api/v2/source-sites/:id`
- `POST /api/v2/source-sites/:id/validate`
- `POST /api/v2/source-sites/:id/preview-discovery`

第一阶段建议开放字段：

- `id`
- `name`
- `type`
- `priority`
- `enabled`
- `base_url`
- `start_urls`
- `include_patterns`
- `detail_patterns`
- `discovery_patterns`
- `exclude_patterns`
- `manual_seed_files`
- `max_sitemaps`
- `max_discovery_pages`
- `max_candidate_urls`
- `delay_ms`
- `delay_min_ms`
- `delay_max_ms`
- `max_failures`
- `max_consecutive_failures`
- `render_via_pinchtab`
- `pinchtab_mode`

说明：

- 这一组字段必须能完整承载当前 `source-sites.v1.json` 的真实配置
- 否则前端编辑并保存来源站点时，容易把现有站点能力编辑丢

### 4.6 Strategy Profile API

建议接口：

- `POST /api/v2/strategy-profiles`
- `GET /api/v2/strategy-profiles`
- `GET /api/v2/strategy-profiles/:id`
- `PATCH /api/v2/strategy-profiles/:id`
- `POST /api/v2/strategy-profiles/:id/simulate`

第一阶段 Step 字段：

- `step_order`
- `name`
- `pinchtabMode`
- `requiresPinchtab`
- `maxFailures`
- `maxConsecutiveFailures`
- `blockCountThreshold`
- `blockRateThreshold`
- `headroom`
- `enabled`

说明：

- 这组 API 必须直接继承现有 `three-layer-runner` 的语义
- 不建议另起一套不兼容字段

### 4.7 Quality Policy API

建议接口：

- `GET /api/v2/quality-policies`
- `GET /api/v2/quality-policies/:id`
- `POST /api/v2/quality-policies`
- `POST /api/v2/quality-policies/:id/activate`

第一阶段建议字段：

- `version`
- `minQualityScore`
- `minTitleLength`
- `minSummaryLength`
- `requireSummary`

### 4.8 Clean Rule Set API

建议接口：

- `GET /api/v2/clean-rule-sets`
- `GET /api/v2/clean-rule-sets/:id`
- `POST /api/v2/clean-rule-sets`
- `PATCH /api/v2/clean-rule-sets/:id`
- `POST /api/v2/clean-rule-sets/:id/preview`

第一阶段建议规则项：

- `tracking_params_drop`
- `official_url_blacklist`
- `domain_dedup_enabled`
- `title_dedup_enabled`
- `url_normalization_enabled`
- `domain_merge_whitelist`
- `domain_merge_blacklist`
- `confidence_weights`

说明：

- 当前不改清洗实现
- 但必须为后续前端配置预留正式 API

### 4.9 Tool / Entity API

建议接口：

- `GET /api/v2/tools`
- `GET /api/v2/tools/:id`
- `GET /api/v2/tools/:id/evidence`
- `GET /api/v2/tools/:id/history`

### 4.10 Export API

建议接口：

- `POST /api/v2/exports`
- `GET /api/v2/exports`
- `GET /api/v2/exports/:id`
- `GET /api/v2/exports/:id/download`

### 4.11 Auth / RBAC API

建议接口：

- `POST /api/v2/auth/login`
- `POST /api/v2/auth/logout`
- `GET /api/v2/auth/me`
- `GET /api/v2/users`
- `GET /api/v2/roles`
- `PATCH /api/v2/users/:id/roles`

第一阶段角色建议：

- `admin`
- `operator`
- `analyst`
- `viewer`

### 4.12 Audit Log API

建议接口：

- `GET /api/v2/audit-logs`

应记录的行为：

- 谁创建了 run
- 谁取消了 run
- 谁重试了 task
- 谁修改了 source site
- 谁修改了三层策略
- 谁切换了 quality policy
- 谁修改了 clean rule set
- 谁导出了数据

重点：

- `audit_logs` 是用户行为
- `pipeline_events` 是机器执行事件
- 这两类信息不能混用

### 4.13 Preferences / Saved Views API

建议接口：

- `GET /api/v2/me/preferences`
- `PATCH /api/v2/me/preferences`
- `GET /api/v2/saved-views`
- `POST /api/v2/saved-views`

### 4.14 Ops / System API

建议接口：

- `GET /api/v2/system/health`
- `GET /api/v2/system/metrics`
- `GET /api/v2/system/queues`
- `GET /api/v2/system/workers`
- `GET /api/v2/system/runs/active`

## 5. 设计原则

### 5.1 保留 `/api/v1/*`

原因：

- 现有 smoke 流程依赖它
- 现有 worker 链路依赖它

建议：

- `/api/v1/*` 继续作为底层兼容接口
- `/api/v2/*` 作为平台正式接口

### 5.2 平台能力不要继续堆在 CLI 上

原因：

- 三层策略还在脚本里
- 清洗逻辑还在脚本里

这两块都应逐步平台化，而不是长期停留在脚本能力。

### 5.3 不要让前端直接拼底层参数

前端不应长期直接面向这些低层参数：

- `seedUrls`
- `candidateLimitPerSource`
- `discoveryPageLimit`
- `coldStart`

它们应被收敛到：

- 模板
- 策略 profile
- 高级设置面板
