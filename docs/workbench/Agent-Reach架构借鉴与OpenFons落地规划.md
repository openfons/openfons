# Agent-Reach 架构借鉴与 OpenFons 落地规划

> **文档日期**: 2026-03-30  
> **参考项目**: [Agent-Reach](../history/Agent-Reach-main/)  
> **目标**: 分析 Agent-Reach 的架构设计亮点，规划如何在 OpenFons 中落地这些模式

---

## 一、Agent-Reach 项目概述

### 1.1 核心定位

Agent-Reach 是一个 **AI Agent 基础设施工具**，为语言模型提供无缝的公共互联网访问能力。核心理念：

> **"Scaffolding not Framework"** — 脚手架而非框架

它不包装上游工具，而是：
1. 帮助安装依赖 (bird CLI, yt-dlp, gh CLI, mcporter...)
2. 统一配置管理 (认证、代理、凭证)
3. 健康检查诊断 (doctor 命令)
4. 然后 **Agent 直接调用上游工具**

### 1.2 支持的平台 (17个)

| 分类 | 平台 |
|------|------|
| **社交媒体** | Twitter/X、微博、小红书、V2EX |
| **视频平台** | YouTube、B站、抖音 |
| **职业社交** | LinkedIn、GitHub |
| **内容平台** | 微信公众号、雪球、播客(小宇宙) |
| **通用采集** | Jina Reader (任意网页)、RSS、Exa 语义搜索 |

### 1.3 技术栈

- **语言**: Python 3.10+
- **依赖**: requests, feedparser, python-dotenv, loguru, pyyaml, rich, yt-dlp
- **可选**: camoufox (浏览器自动化), MCP server 集成

---

## 二、值得借鉴的架构模式

### 2.1 可插拔的 Channel 架构 ⭐⭐⭐

#### 2.1.1 设计分析

Agent-Reach 将每个数据源抽象为 `Channel`，具有统一接口：

```python
class Channel:
    """数据源通道抽象基类"""
    name: str          # 唯一标识符 (如 "twitter", "youtube")
    description: str   # 人类可读名称 (如 "Twitter/X")
    backends: list     # 依赖的上游工具 (如 ["bird"])
    tier: int          # 配置复杂度等级
    
    def can_handle(self, url: str) -> bool:
        """判断该 Channel 是否能处理给定 URL"""
        pass
    
    def check(self, config: Config) -> tuple[str, str]:
        """健康检查，返回 (状态, 消息)"""
        # 状态: "ok" | "warn" | "off" | "error"
        pass
```

#### 2.1.2 Tier 分层策略

| Tier | 含义 | 示例 |
|------|------|------|
| **0** | 零配置，安装即用 | Jina Reader, YouTube (yt-dlp), B站 |
| **1** | 需要免费 API Key 或简单认证 | Twitter (需 cookies), GitHub (需 auth) |
| **2** | 需要付费或复杂配置 | Exa 语义搜索, LinkedIn |

#### 2.1.3 工厂模式注册

```python
# channels/__init__.py
ALL_CHANNELS = [
    TwitterChannel(),
    YouTubeChannel(),
    GitHubChannel(),
    XiaohongshuChannel(),
    # ... 更多
]

def get_channel(name: str) -> Channel | None:
    """按名称获取 Channel"""
    
def get_all_channels() -> list[Channel]:
    """获取所有已注册 Channel"""
```

---

### 2.2 Doctor 健康检查系统 ⭐⭐⭐

#### 2.2.1 设计分析

提供统一的 `doctor` 命令，一键检查所有数据源状态：

```bash
$ agent-reach doctor

Zero-config channels (Tier 0):
  ✅ web         Jina Reader for any webpage
  ✅ youtube     yt-dlp with JS runtime (deno detected)
  ⚠️ bilibili    yt-dlp available, but cookies recommended

Channels requiring free key (Tier 1):
  ✅ twitter     bird CLI authenticated
  -- github      gh CLI not authenticated (run: gh auth login)

Optional setup channels (Tier 2):
  -- exa_search  EXA_API_KEY not configured
```

#### 2.2.2 核心实现

```python
def check_all(config: Config) -> list[dict]:
    """检查所有 Channel 状态"""
    results = []
    for channel in get_all_channels():
        status, message = channel.check(config)
        results.append({
            "name": channel.name,
            "description": channel.description,
            "tier": channel.tier,
            "status": status,
            "message": message
        })
    return results

def format_report(results: list[dict]) -> str:
    """格式化可读报告，按 Tier 分组，彩色输出"""
```

---

### 2.3 安全的配置管理 ⭐⭐

#### 2.3.1 设计分析

```yaml
# ~/.agent-reach/config.yaml
# 文件权限: 0o600 (仅所有者读写)

exa_api_key: "sk-..."
github_token: "ghp_..."
twitter_cookies: "/path/to/cookies.txt"
proxy: "socks5://127.0.0.1:1080"
```

#### 2.3.2 核心特性

1. **环境变量回退**: `config.get("exa_api_key")` 自动检查 `EXA_API_KEY` 环境变量
2. **敏感值 Mask**: 日志和 UI 中自动遮蔽 `*_key`, `*_token`, `*_secret`
3. **浏览器 Cookie 提取**: `--from-browser chrome/firefox/edge`

```python
class Config:
    def get(self, key: str, default=None):
        # 1. 先查配置文件
        # 2. 再查环境变量 (KEY.upper())
        # 3. 返回默认值
        
    def save(self):
        # 保存时设置 0o600 权限
        os.chmod(self.path, 0o600)
```

---

### 2.4 SKILL.md — Agent 可读的技能文档 ⭐⭐⭐

#### 2.4.1 设计分析

为 AI Agent 提供标准化的使用文档：

```text
# Agent Reach Skills

## Twitter
Search and read Twitter/X content.

### Commands
- bird search "query" — Search tweets
- bird read URL — Read a single tweet/thread
- bird user-tweets @handle — Get user's recent tweets

### Examples
  bird search "AI agents" --limit 20
  bird read https://x.com/user/status/123456

## YouTube
Extract video metadata and subtitles.

### Commands
- yt-dlp --dump-json URL — Get video metadata
- yt-dlp --write-sub --skip-download URL — Download subtitles only
```

#### 2.4.2 设计要点

1. **结构化格式**: 每个平台有固定的 Commands / Examples / Notes 结构
2. **可执行示例**: 所有命令都是可直接运行的
3. **限制说明**: 明确各平台的速率限制、认证要求等

---

### 2.5 响应格式清洗 ⭐⭐

#### 2.5.1 设计分析

对于 API 响应进行标准化清洗，减少 Token 消耗：

```python
def format_xhs_result(raw_response: dict) -> dict:
    """清洗小红书 API 响应，只保留必要字段"""
    return {
        "id": raw_response.get("note_id"),
        "title": raw_response.get("title"),
        "author": {
            "id": raw_response["user"]["user_id"],
            "nickname": raw_response["user"]["nickname"]
        },
        "stats": {
            "likes": raw_response.get("liked_count"),
            "comments": raw_response.get("comment_count"),
            "collects": raw_response.get("collected_count")
        },
        "images": [img["url"] for img in raw_response.get("images", [])],
        "tags": [tag["name"] for tag in raw_response.get("tags", [])],
        # 移除冗余的嵌套结构、调试信息等
    }
```

---

## 三、OpenFons 落地规划

### 3.1 整体架构映射

```
Agent-Reach                    OpenFons
─────────────────────────────────────────────────────
Channel                   →    Source (数据源)
Channel.check()           →    Source.healthCheck()
Channel.can_handle()      →    Source.canCapture()
Config                    →    CredentialStore
doctor                    →    /api/health + 控制面板健康看板
SKILL.md                  →    TaskSpec 驱动的 Skill 文档
tier 分层                 →    SourceTier (配置复杂度分级)
```

### 3.2 Source 接口设计

在 `packages/contracts/src/source.ts` 中定义：

```typescript
/**
 * 数据源配置复杂度等级
 */
export enum SourceTier {
  /** Tier 0: 零配置，安装即用 */
  ZERO_CONFIG = 0,
  /** Tier 1: 需要免费 API Key 或简单认证 */
  FREE_AUTH = 1,
  /** Tier 2: 需要付费或复杂配置 */
  PAID_OR_COMPLEX = 2,
}

/**
 * 健康检查状态
 */
export type HealthStatus = 'ok' | 'warn' | 'off' | 'error';

/**
 * 健康检查结果
 */
export interface HealthCheckResult {
  status: HealthStatus;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * 数据源接口 - 所有采集源的抽象基类
 */
export interface Source {
  /** 唯一标识符 */
  readonly id: string;
  
  /** 人类可读名称 */
  readonly name: string;
  
  /** 描述信息 */
  readonly description: string;
  
  /** 依赖的后端工具 */
  readonly backends: string[];
  
  /** 配置复杂度等级 */
  readonly tier: SourceTier;
  
  /** 支持的 URL 模式 (正则表达式) */
  readonly urlPatterns: RegExp[];
  
  /**
   * 判断是否能采集给定 URL
   */
  canCapture(url: string): boolean;
  
  /**
   * 执行健康检查
   */
  healthCheck(): Promise<HealthCheckResult>;
  
  /**
   * 执行采集
   */
  capture(url: string, options?: CaptureOptions): Promise<SourceCapture>;
}

/**
 * 采集选项
 */
export interface CaptureOptions {
  /** 是否包含评论 */
  includeComments?: boolean;
  /** 是否下载媒体 */
  downloadMedia?: boolean;
  /** 代理配置 */
  proxy?: string;
  /** 超时时间 (ms) */
  timeout?: number;
}

/**
 * 数据源采集结果
 */
export interface SourceCapture {
  /** 数据源 ID */
  sourceId: string;
  /** 采集的 URL */
  url: string;
  /** 采集时间 (ISO 8601) */
  capturedAt: string;
  /** 采集的数据 */
  data: Record<string, unknown>;
  /** 原始响应 (可选，用于调试) */
  rawResponse?: unknown;
  /** 采集耗时 (ms) */
  durationMs?: number;
  /** 错误信息 (如果采集失败) */
  error?: string;
}
```

### 3.3 Source 注册与路由

在 `packages/contracts/src/source-registry.ts` 中：

```typescript
/**
 * 数据源注册表
 */
export class SourceRegistry {
  private sources: Map<string, Source> = new Map();
  
  /**
   * 注册数据源
   */
  register(source: Source): void {
    this.sources.set(source.id, source);
  }
  
  /**
   * 根据 URL 查找合适的数据源 (返回优先级最高的)
   */
  findByUrl(url: string): Source | undefined {
    const matches: Source[] = [];
    for (const source of this.sources.values()) {
      if (source.canCapture(url)) {
        matches.push(source);
      }
    }
    // 按 Tier 排序，Tier 越低优先级越高 (ZERO_CONFIG > FREE_AUTH > PAID_OR_COMPLEX)
    // 同 Tier 下按注册顺序
    if (matches.length === 0) return undefined;
    return matches.sort((a, b) => a.tier - b.tier)[0];
  }
  
  /**
   * 根据 URL 查找所有能处理的数据源
   */
  findAllByUrl(url: string): Source[] {
    return Array.from(this.sources.values()).filter(s => s.canCapture(url));
  }
  
  /**
   * 获取所有数据源
   */
  getAll(): Source[] {
    return Array.from(this.sources.values());
  }
  
  /**
   * 按 Tier 分组获取
   */
  getByTier(): Record<SourceTier, Source[]> {
    const result: Record<SourceTier, Source[]> = {
      [SourceTier.ZERO_CONFIG]: [],
      [SourceTier.FREE_AUTH]: [],
      [SourceTier.PAID_OR_COMPLEX]: [],
    };
    
    for (const source of this.sources.values()) {
      result[source.tier].push(source);
    }
    
    return result;
  }
}

// 全局单例
export const sourceRegistry = new SourceRegistry();
```

### 3.4 健康检查 API 端点

在 `services/control-api/src/routes/health.ts` 中：

```typescript
import { Hono } from 'hono';
import { sourceRegistry } from '@openfons/contracts';

const healthRouter = new Hono();

/**
 * GET /api/health/sources
 * 获取所有数据源的健康状态
 */
healthRouter.get('/sources', async (c) => {
  const sources = sourceRegistry.getAll();
  
  // 使用 Promise.allSettled 确保单个 source 异常不影响整体
  const settledResults = await Promise.allSettled(
    sources.map(async (source) => {
      const health = await source.healthCheck();
      return {
        id: source.id,
        name: source.name,
        description: source.description,
        tier: source.tier,
        backends: source.backends,
        health,
      };
    })
  );
  
  const results = settledResults.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    // 处理异常情况
    const source = sources[index];
    return {
      id: source.id,
      name: source.name,
      description: source.description,
      tier: source.tier,
      backends: source.backends,
      health: {
        status: 'error' as const,
        message: `健康检查异常: ${result.reason?.message || 'Unknown error'}`,
      },
    };
  });
  
  // 按 Tier 分组
  const grouped = {
    zeroConfig: results.filter(r => r.tier === 0),
    freeAuth: results.filter(r => r.tier === 1),
    paidOrComplex: results.filter(r => r.tier === 2),
  };
  
  // 计算摘要
  const summary = {
    total: results.length,
    ok: results.filter(r => r.health.status === 'ok').length,
    warn: results.filter(r => r.health.status === 'warn').length,
    off: results.filter(r => r.health.status === 'off').length,
    error: results.filter(r => r.health.status === 'error').length,
  };
  
  return c.json({ summary, grouped, results });
});

/**
 * GET /api/health/sources/:id
 * 获取单个数据源的详细健康状态
 */
healthRouter.get('/sources/:id', async (c) => {
  const { id } = c.req.param();
  const source = sourceRegistry.getAll().find(s => s.id === id);
  
  if (!source) {
    return c.json({ error: 'Source not found' }, 404);
  }
  
  const health = await source.healthCheck();
  
  return c.json({
    id: source.id,
    name: source.name,
    description: source.description,
    tier: source.tier,
    backends: source.backends,
    urlPatterns: source.urlPatterns.map(p => p.source),
    health,
  });
});

export { healthRouter };
```

### 3.5 凭证存储设计

在 `packages/shared/src/credential-store.ts` 中：

```typescript
import { readFile, writeFile, chmod, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { parse, stringify } from 'yaml';

/**
 * 敏感字段模式 (用于日志脱敏)
 */
const SENSITIVE_PATTERNS = [
  /key$/i,
  /token$/i,
  /secret$/i,
  /password$/i,
  /cookie/i,
];

/**
 * 凭证存储
 */
export class CredentialStore {
  private configPath: string;
  private cache: Record<string, string> = {};
  
  constructor(configDir?: string) {
    const dir = configDir ?? join(homedir(), '.openfons');
    this.configPath = join(dir, 'credentials.yaml');
  }
  
  /**
   * 加载配置
   */
  async load(): Promise<void> {
    try {
      const content = await readFile(this.configPath, 'utf-8');
      this.cache = parse(content) ?? {};
    } catch {
      this.cache = {};
    }
  }
  
  /**
   * 保存配置 (设置安全权限)
   */
  async save(): Promise<void> {
    const content = stringify(this.cache);
    // 确保配置目录存在
    const dir = dirname(this.configPath);
    await mkdir(dir, { recursive: true }).catch(() => {});
    // 写入配置文件
    await writeFile(this.configPath, content, 'utf-8');
    // Windows 上 chmod 可能不生效，但仍调用以保持跨平台一致性
    await chmod(this.configPath, 0o600).catch(() => {});
  }
  
  /**
   * 获取配置值 (支持环境变量回退)
   */
  get(key: string, defaultValue?: string): string | undefined {
    // 1. 配置文件优先
    if (this.cache[key]) {
      return this.cache[key];
    }
    
    // 2. 环境变量回退 (转为大写下划线格式)
    const envKey = key.toUpperCase().replace(/-/g, '_');
    const envValue = process.env[envKey];
    if (envValue) {
      return envValue;
    }
    
    // 3. 默认值
    return defaultValue;
  }
  
  /**
   * 设置配置值
   */
  set(key: string, value: string): void {
    this.cache[key] = value;
  }
  
  /**
   * 删除配置值
   */
  delete(key: string): void {
    delete this.cache[key];
  }
  
  /**
   * 检查是否已配置
   */
  isConfigured(key: string): boolean {
    return this.get(key) !== undefined;
  }
  
  /**
   * 获取脱敏后的配置 (用于日志和 UI 展示)
   */
  getMasked(): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(this.cache)) {
      const isSensitive = SENSITIVE_PATTERNS.some(p => p.test(key));
      result[key] = isSensitive ? maskValue(value) : value;
    }
    
    return result;
  }
}

/**
 * 脱敏处理
 */
function maskValue(value: string): string {
  if (value.length <= 8) {
    return '****';
  }
  return value.slice(0, 4) + '****' + value.slice(-4);
}

// 全局单例
export const credentialStore = new CredentialStore();
```

### 3.6 具体 Source 实现示例

#### 3.6.1 YouTube Source

在 `services/control-api/src/sources/youtube.ts` 中：

```typescript
import { Source, SourceTier, HealthCheckResult, SourceCapture, CaptureOptions } from '@openfons/contracts';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class YouTubeSource implements Source {
  readonly id = 'youtube';
  readonly name = 'YouTube';
  readonly description = '通过 yt-dlp 采集 YouTube 视频元数据和字幕';
  readonly backends = ['yt-dlp'];
  readonly tier = SourceTier.ZERO_CONFIG;
  readonly urlPatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch/,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\//,
    /^https?:\/\/(www\.)?youtube\.com\/live\//,
    /^https?:\/\/(www\.)?youtube\.com\/playlist/,
    /^https?:\/\/youtu\.be\//,
  ];
  
  canCapture(url: string): boolean {
    return this.urlPatterns.some(p => p.test(url));
  }
  
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // 检查 yt-dlp 是否安装
      await execAsync('yt-dlp --version');
      
      // 检查 JavaScript 运行时 (用于某些提取器)
      let jsRuntime = 'none';
      try {
        await execAsync('deno --version');
        jsRuntime = 'deno';
      } catch {
        try {
          await execAsync('node --version');
          jsRuntime = 'node';
        } catch {
          // 无 JS 运行时，部分功能可能受限
        }
      }
      
      if (jsRuntime === 'none') {
        return {
          status: 'warn',
          message: 'yt-dlp 可用，但无 JS 运行时，部分视频可能无法采集',
          details: { jsRuntime },
        };
      }
      
      return {
        status: 'ok',
        message: `yt-dlp 可用，JS 运行时: ${jsRuntime}`,
        details: { jsRuntime },
      };
    } catch {
      return {
        status: 'off',
        message: 'yt-dlp 未安装，请运行: pip install yt-dlp',
      };
    }
  }
  
  async capture(url: string, options?: CaptureOptions): Promise<SourceCapture> {
    const startTime = Date.now();
    const args = ['--dump-json'];
    
    if (options?.proxy) {
      args.push('--proxy', options.proxy);
    }
    
    // 安全处理：使用参数数组而非字符串拼接，防止命令注入
    args.push('--', url);
    
    const { stdout } = await execAsync(`yt-dlp ${args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`);
    const metadata = JSON.parse(stdout);
    
    return {
      sourceId: this.id,
      url,
      capturedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      data: {
        id: metadata.id,
        title: metadata.title,
        description: metadata.description,
        duration: metadata.duration,
        viewCount: metadata.view_count,
        likeCount: metadata.like_count,
        channel: {
          id: metadata.channel_id,
          name: metadata.channel,
          url: metadata.channel_url,
        },
        uploadDate: metadata.upload_date,
        tags: metadata.tags,
        thumbnailUrl: metadata.thumbnail,
        subtitles: metadata.subtitles,
      },
    };
  }
}
```

#### 3.6.2 小红书 Source

在 `services/control-api/src/sources/xiaohongshu.ts` 中：

```typescript
import { Source, SourceTier, HealthCheckResult, SourceCapture } from '@openfons/contracts';
import { credentialStore } from '@openfons/shared';

export class XiaohongshuSource implements Source {
  readonly id = 'xiaohongshu';
  readonly name = '小红书';
  readonly description = '采集小红书笔记内容';
  readonly backends = ['xhs-mcp'];
  readonly tier = SourceTier.FREE_AUTH;
  readonly urlPatterns = [
    /^https?:\/\/(www\.)?xiaohongshu\.com\/explore\//,
    /^https?:\/\/(www\.)?xhslink\.com\//,
  ];
  
  canCapture(url: string): boolean {
    return this.urlPatterns.some(p => p.test(url));
  }
  
  async healthCheck(): Promise<HealthCheckResult> {
    const cookies = credentialStore.get('xhs-cookies');
    
    if (!cookies) {
      return {
        status: 'off',
        message: '小红书 Cookies 未配置',
      };
    }
    
    // TODO: 验证 cookies 是否有效
    return {
      status: 'ok',
      message: '小红书 Cookies 已配置',
    };
  }
  
  async capture(url: string, options?: CaptureOptions): Promise<SourceCapture> {
    const startTime = Date.now();
    // TODO: 实现采集逻辑
    throw new Error('Not implemented');
  }
}

/**
 * 清洗小红书 API 响应，减少 Token 消耗
 */
export function formatXhsResult(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    id: raw.note_id,
    title: raw.title,
    content: raw.desc,
    author: {
      id: (raw.user as Record<string, unknown>)?.user_id,
      nickname: (raw.user as Record<string, unknown>)?.nickname,
      avatar: (raw.user as Record<string, unknown>)?.avatar,
    },
    stats: {
      likes: raw.liked_count,
      comments: raw.comment_count,
      collects: raw.collected_count,
      shares: raw.share_count,
    },
    images: ((raw.images as Array<Record<string, unknown>>) ?? []).map(img => ({
      url: img.url,
      width: img.width,
      height: img.height,
    })),
    tags: ((raw.tags as Array<Record<string, unknown>>) ?? []).map(tag => tag.name),
    publishTime: raw.time,
    // 移除冗余字段: trace_id, log_id, 嵌套的原始结构等
  };
}
```

### 3.7 控制面板健康看板 UI

在 `apps/control-web/src/pages/health.tsx` 中：

```tsx
import { useEffect, useState } from 'react';
import { api } from '../api';

type HealthStatus = 'ok' | 'warn' | 'off' | 'error';

interface SourceHealth {
  id: string;
  name: string;
  description: string;
  tier: number;
  backends: string[];
  health: {
    status: HealthStatus;
    message: string;
  };
}

const STATUS_ICONS: Record<HealthStatus, string> = {
  ok: '✅',
  warn: '⚠️',
  off: '--',
  error: '❌',
};

export function HealthPage() {
  const [data, setData] = useState<{
    summary: { total: number; ok: number; warn: number; off: number; error: number };
    grouped: { zeroConfig: SourceHealth[]; freeAuth: SourceHealth[]; paidOrComplex: SourceHealth[] };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    api.get('/health/sources')
      .then(setData)
      .catch(err => setError(err.message || '加载失败'))
      .finally(() => setLoading(false));
  }, []);
  
  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error">错误: {error}</div>;
  if (!data) return <div className="empty">暂无数据</div>;
  
  const { summary, grouped } = data;
  
  return (
    <div className="health-page">
      <h1>数据源健康状态</h1>
      
      {/* 摘要卡片 */}
      <div className="summary-cards">
        <div className="card">
          <span className="number">{summary.total}</span>
          <span className="label">总计</span>
        </div>
        <div className="card ok">
          <span className="number">{summary.ok}</span>
          <span className="label">正常</span>
        </div>
        <div className="card warn">
          <span className="number">{summary.warn}</span>
          <span className="label">警告</span>
        </div>
        <div className="card off">
          <span className="number">{summary.off}</span>
          <span className="label">未启用</span>
        </div>
        <div className="card error">
          <span className="number">{summary.error}</span>
          <span className="label">错误</span>
        </div>
      </div>
      
      {/* 分组列表 */}
      <SourceGroup title="Tier 0: 零配置" sources={grouped.zeroConfig} />
      <SourceGroup title="Tier 1: 免费认证" sources={grouped.freeAuth} />
      <SourceGroup title="Tier 2: 付费/复杂配置" sources={grouped.paidOrComplex} />
    </div>
  );
}

function SourceGroup({ title, sources }: { title: string; sources: SourceHealth[] }) {
  if (sources.length === 0) return null;
  
  return (
    <section className="source-group">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            <th>状态</th>
            <th>数据源</th>
            <th>后端工具</th>
            <th>消息</th>
          </tr>
        </thead>
        <tbody>
          {sources.map(source => (
            <tr key={source.id} className={source.health.status}>
              <td>{STATUS_ICONS[source.health.status]}</td>
              <td>
                <strong>{source.name}</strong>
                <br />
                <small>{source.description}</small>
              </td>
              <td>{source.backends.join(', ')}</td>
              <td>{source.health.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

### 3.8 CLI Doctor 命令

在 `services/control-api/src/cli/doctor.ts` 中：

```typescript
#!/usr/bin/env node
import { sourceRegistry } from '@openfons/contracts';
import { credentialStore } from '@openfons/shared';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

const STATUS_COLORS: Record<string, string> = {
  ok: COLORS.green,
  warn: COLORS.yellow,
  off: COLORS.dim,
  error: COLORS.red,
};

const STATUS_ICONS: Record<string, string> = {
  ok: '✅',
  warn: '⚠️',
  off: '--',
  error: '❌',
};

async function main() {
  console.log('OpenFons 数据源健康检查\n');
  
  await credentialStore.load();
  
  const sources = sourceRegistry.getAll();
  const byTier = sourceRegistry.getByTier();
  
  // Tier 0
  console.log('Tier 0: 零配置 (安装即用)');
  console.log('─'.repeat(60));
  for (const source of byTier[0]) {
    await printSourceHealth(source);
  }
  
  console.log('\nTier 1: 免费认证');
  console.log('─'.repeat(60));
  for (const source of byTier[1]) {
    await printSourceHealth(source);
  }
  
  console.log('\nTier 2: 付费/复杂配置');
  console.log('─'.repeat(60));
  for (const source of byTier[2]) {
    await printSourceHealth(source);
  }
}

async function printSourceHealth(source: { id: string; healthCheck: () => Promise<{ status: string; message: string }> }) {
  const health = await source.healthCheck();
  const color = STATUS_COLORS[health.status];
  const icon = STATUS_ICONS[health.status];
  
  console.log(
    `  ${color}${icon}${COLORS.reset} ` +
    `${source.id.padEnd(15)} ` +
    `${health.message}`
  );
}

main().catch(console.error);
```

---

## 四、实施路线图

### Phase 1: 基础架构 (Week 1-2)

> 说明: 以下时间线为相对周数，从项目启动开始计算

| 任务 | 产出 | 优先级 |
|------|------|--------|
| 定义 Source 接口 | `packages/contracts/src/source.ts` | P0 |
| 实现 SourceRegistry | `packages/contracts/src/source-registry.ts` | P0 |
| 实现 CredentialStore | `packages/shared/src/credential-store.ts` | P0 |
| 健康检查 API 端点 | `services/control-api/src/routes/health.ts` | P1 |

### Phase 2: 首批 Source 实现 (Week 3-4)

| 任务 | 产出 | 优先级 |
|------|------|--------|
| YouTube Source | `services/control-api/src/sources/youtube.ts` | P0 |
| 通用网页 Source (Jina) | `services/control-api/src/sources/web.ts` | P0 |
| GitHub Source | `services/control-api/src/sources/github.ts` | P1 |
| RSS Source | `services/control-api/src/sources/rss.ts` | P1 |

### Phase 3: 中国平台适配 (Week 5-6)

| 任务 | 产出 | 优先级 |
|------|------|--------|
| 小红书 Source | `services/control-api/src/sources/xiaohongshu.ts` | P0 |
| 微博 Source | `services/control-api/src/sources/weibo.ts` | P1 |
| B站 Source | `services/control-api/src/sources/bilibili.ts` | P1 |

### Phase 4: 控制面板 UI (Week 7-8)

| 任务 | 产出 | 优先级 |
|------|------|--------|
| 健康看板页面 | `apps/control-web/src/pages/health.tsx` | P0 |
| 凭证配置页面 | `apps/control-web/src/pages/credentials.tsx` | P1 |
| CLI doctor 命令 | `services/control-api/src/cli/doctor.ts` | P1 |

---

## 五、与北极星目标对齐

### 5.1 契约映射

| Agent-Reach 概念 | OpenFons 契约 |
|------------------|---------------|
| Channel | Source |
| Channel.check() | Source.healthCheck() → 服务 HealthStatus |
| Channel capture output | SourceCapture → 进入 EvidenceSet |
| Config | CredentialStore (隔离存储) |
| SKILL.md | TaskSpec 驱动的执行文档 |

### 5.2 执行模型对齐

```
用户研究意图
    ↓
OpportunitySpec (编译后的规格)
    ↓
TaskSpec (具体任务定义)
    ↓
Source.capture() (数据源采集)
    ↓
SourceCapture → CollectionLog
    ↓
Evidence → EvidenceSet
    ↓
ReportSpec (报告规格)
    ↓
可盈利的网页报告
```

### 5.3 "Agent compiles, Worker executes" 落地

1. **Agent 编译阶段**: 
   - 解析用户意图 → 生成 OpportunitySpec
   - 根据 OpportunitySpec 生成 TaskSpec 列表
   - TaskSpec 中引用 Source.id 和采集参数

2. **Worker 执行阶段**:
   - 根据 TaskSpec 中的 Source.id 查找 SourceRegistry
   - 调用 Source.capture() 执行采集
   - 结果写入 SourceCapture → CollectionLog → Evidence

---

## 六、风险与挑战

### 6.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **上游工具不稳定** | yt-dlp/bird 等工具可能被平台封禁 | 多后端支持、降级策略 |
| **平台 API 变更** | 小红书/微博等可能改变接口 | 抽象适配器层、版本管理 |
| **凭证失效** | Cookies/Token 过期 | 健康检查预警、自动刷新机制 |
| **并发采集性能** | 大量采集任务可能拖慢系统 | 队列调度、速率限制 |

### 6.2 安全风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **凭证泄露** | API Key/Cookies 被窃取 | 0o600 权限、环境变量优先、日志脱敏 |
| **命令注入** | 恶意 URL 注入 shell 命令 | 参数转义、使用 `--` 分隔符 |
| **超频请求** | 触发平台风控 | 速率限制、IP 轮换 |

### 6.3 运维风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **多 Source 状态不一致** | 部分源可用部分不可用 | 分级健康检查、降级策略 |
| **依赖版本冲突** | yt-dlp 等版本不兼容 | 锁定版本、定期更新 |

---

## 七、与现有 OpenFons 契约集成

### 7.1 现有契约结构

当前 `packages/contracts/src/index.ts` 已定义的核心类型：

- `Topic` / `TopicRun` — 研究主题与运行实例
- `OpportunitySpec` — 机会规格
- `TaskSpec` / `WorkflowSpec` — 任务与工作流规格
- `ReportSpec` — 报告规格
- `Evidence` / `EvidenceSet` — 证据与证据集

### 7.2 Source 与现有契约的关系

```typescript
// packages/contracts/src/index.ts 中新增导出
export * from './source';           // Source 接口
export * from './source-registry';  // SourceRegistry

// TaskSpec 中引用 Source
interface TaskSpec {
  id: string;
  type: 'capture' | 'analyze' | 'compile';
  // 当 type === 'capture' 时
  sourceId?: string;           // 引用 Source.id
  captureOptions?: CaptureOptions;
  targetUrls?: string[];
  // ...
}

// SourceCapture 转换为 CollectionLog / Evidence
interface CollectionLog {
  topicRunId: string;
  sourceCapture: SourceCapture;  // 直接嵌入
  createdAt: string;
}
```

### 7.3 集成位置

```
packages/contracts/
├── src/
│   ├── index.ts              # 统一导出
│   ├── source.ts             # ← 新增: Source, SourceTier, HealthCheckResult, SourceCapture
│   ├── source-registry.ts    # ← 新增: SourceRegistry
│   ├── topic.ts              # 现有
│   ├── task-spec.ts          # 现有 (需扩展 sourceId)
│   └── ...
```

---

## 八、测试策略

### 8.1 单元测试

```typescript
// tests/unit/source-registry.test.ts
import { describe, it, expect, vi } from 'vitest';
import { SourceRegistry, SourceTier, Source, HealthCheckResult, SourceCapture, CaptureOptions } from '@openfons/contracts';

// Mock Source 创建工具
function createMockSource(
  id: string, 
  tier: SourceTier = SourceTier.ZERO_CONFIG,
  urlPattern: RegExp = /youtube\.com/
): Source {
  return {
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    description: `Mock ${id} source`,
    backends: [`${id}-cli`],
    tier,
    urlPatterns: [urlPattern],
    canCapture: (url: string) => urlPattern.test(url),
    healthCheck: async () => ({ status: 'ok', message: 'Mock healthy' }),
    capture: async (url: string, options?: CaptureOptions) => ({
      sourceId: id,
      url,
      capturedAt: new Date().toISOString(),
      data: { mock: true },
    }),
  };
}

describe('SourceRegistry', () => {
  it('should register and find source by id', () => {
    const registry = new SourceRegistry();
    const mockSource = createMockSource('youtube');
    
    registry.register(mockSource);
    
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.findByUrl('https://youtube.com/watch?v=xxx')).toBe(mockSource);
  });
  
  it('should group sources by tier', () => {
    const registry = new SourceRegistry();
    registry.register(createMockSource('youtube', SourceTier.ZERO_CONFIG));
    registry.register(createMockSource('twitter', SourceTier.FREE_AUTH));
    
    const byTier = registry.getByTier();
    
    expect(byTier[SourceTier.ZERO_CONFIG]).toHaveLength(1);
    expect(byTier[SourceTier.FREE_AUTH]).toHaveLength(1);
  });
});
```

### 8.2 集成测试

```typescript
// tests/integration/youtube-source.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { YouTubeSource } from '@openfons/control-api/sources';

describe('YouTubeSource Integration', () => {
  let source: YouTubeSource;
  
  beforeAll(() => {
    source = new YouTubeSource();
  });
  
  it('should pass health check when yt-dlp is installed', async () => {
    const result = await source.healthCheck();
    // 根据环境可能是 ok 或 warn
    expect(['ok', 'warn']).toContain(result.status);
  });
  
  it('should capture video metadata', async () => {
    const capture = await source.capture(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
    
    expect(capture.sourceId).toBe('youtube');
    expect(capture.data.title).toBeDefined();
    expect(capture.data.channel).toBeDefined();
  }, 30000); // 30s 超时
});
```

### 8.3 测试矩阵

| 测试类型 | 范围 | 工具 | CI 触发 |
|----------|------|------|----------|
| 单元测试 | 所有 Source 逻辑 | Vitest + Mock | 每次 PR |
| 集成测试 | 实际采集流程 | Vitest + 真实网络 | 每日构建 |
| E2E 测试 | 健康看板 UI | Playwright | 发布前 |
| 契约测试 | API 响应格式 | Vitest + Zod | 每次 PR |

---

## 九、监控与日志规范

### 9.1 日志级别

| 级别 | 场景 | 示例 |
|------|------|------|
| **ERROR** | 采集失败、关键异常 | `Source youtube capture failed: timeout` |
| **WARN** | 可恢复问题、降级 | `YouTube cookies expired, falling back to public API` |
| **INFO** | 正常操作、状态变更 | `Source xiaohongshu health check: ok` |
| **DEBUG** | 调试信息 | `yt-dlp args: ["--dump-json", "--", "..."]` |

### 9.2 结构化日志格式

```json
{
  "timestamp": "2026-03-30T10:15:30.123Z",
  "level": "INFO",
  "source": "youtube",
  "action": "capture",
  "url": "https://youtube.com/watch?v=xxx",
  "durationMs": 1234,
  "status": "success"
}
```

### 9.3 监控指标

| 指标 | 类型 | 说明 |
|------|------|------|
| `source_health_status` | Gauge | 各数据源健康状态 (0=error, 1=off, 2=warn, 3=ok) |
| `source_capture_total` | Counter | 采集次数 (按 source, status 分组) |
| `source_capture_duration_ms` | Histogram | 采集耗时分布 |
| `credential_expiry_days` | Gauge | 凭证过期剩余天数 |

### 9.4 告警规则

| 告警 | 条件 | 优先级 |
|------|------|--------|
| Source 失效 | 连续 3 次健康检查失败 | P1 |
| 采集成功率下降 | 成功率 < 80% (过去 1 小时) | P2 |
| 凭证即将过期 | 剩余 < 7 天 | P2 |
| 全部 Source 不可用 | 所有 Source health=error | P0 |

---

## 十、总结

Agent-Reach 项目提供了一套成熟的数据源管理架构，其核心设计模式可直接应用于 OpenFons：

1. **可插拔的 Source 架构** — 统一接口，灵活扩展
2. **Tier 分层管理** — 清晰的配置复杂度预期
3. **Doctor 健康检查** — 一键诊断，降低运维成本
4. **安全凭证管理** — 隔离存储，环境变量回退
5. **响应格式清洗** — 减少 Token 消耗，优化 LLM 处理

通过本文档的落地规划，OpenFons 可以在保持自身"真源优先"理念的同时，快速构建起稳定、可扩展的多平台数据采集能力。
