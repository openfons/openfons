# last30days-skill 深度解析：OpenFons 可借鉴的架构设计与最佳实践

**文档创建时间**：2026-03-30  
**分析对象**：https://github.com/mvanhorn/last30days-skill  
**整理目的**：为 OpenFons 团队提供可落地的架构参考和实现建议

---

## 📋 执行摘要

本文档深度分析了 GitHub 热门项目 `last30days-skill`（跨平台 AI 研究助手）的成功要素，并结合 OpenFons 项目的当前状态，提供了 7 个关键维度的学习建议和具体落地方案。

**核心洞察**：
- ✅ **渐进式数据源解锁**：零配置可用 → 浏览器 Cookie 扫描 → API 密钥升级（40%→80%→100% 质量）
- ✅ **一键式 Setup Wizard**：30 秒自动完成所有配置，Cookie 仅存内存不上磁盘
- ✅ **SKILL.md 标准化**：技能元数据规范支持市场发现和自动安装
- ✅ **两阶段搜索架构**：Discovery Pass（广泛）→ Enrichment Pass（深度挖掘）
- ✅ **输出产物标准化**：人类可读（report.md）+ 机器可读（report.json）+ 紧凑片段（context.md）
- ✅ **嵌入式调用协议**：支持 --emit 模式，可被其他技能/脚本组合使用
- ✅ **首次运行向导**：用问答引导而非冷冰冰的命令行

**OpenFons 差异化优势**：
1. EvidenceSet 真源保护（完整采集快照，不只是引用）
2. OpportunitySpec 商业嗅觉（自动识别订阅/工具/视频机会）
3. MemoryTree 状态管理（跨会话追踪目标和进展）
4. 统一执行模型（Skill/Web/API 三端一致）

---

## 🎯 一、项目对比分析

### 1.1 last30days-skill 概况

| 维度 | 描述 |
|------|------|
| **定位** | 跨平台趋势研究工具 |
| **核心功能** | 研究任意主题 across Reddit, X, YouTube, TikTok, Instagram, Hacker News, Polymarket, Bluesky |
| **交付速度** | 2-8 分钟出报告 |
| **数据源** | 10+ 平台 |
| **技能生态** | 500+ skills on ClawHub |
| **用户门槛** | 零配置可用，渐进式解锁 |
| **商业模式** | API 推荐无回扣（中立） |

### 1.2 OpenFons 当前状态

| 维度 | 描述 |
|------|------|
| **定位** | 源原生情报工作流平台 |
| **核心功能** | 将自然语言意图转化为结构化计划，执行并保存证据 |
| **北极星指标** | 稳定编译 OpportunitySpec → EvidenceSet → ReportSpec |
| **执行模型** | Agent compiles, Worker executes |
| **核心领域对象** | Topic / TopicRun / SourceCapture / CollectionLog / Evidence / EvidenceSet / Artifact |
| **当前阶段** | 架构设计和合同定义阶段 |

### 1.3 关键差距与学习机会

```
差距分析：
├── 用户体验：last30days 有完整的 onboarding 流程，OpenFons 待设计
├── 数据源管理：last30days 有明确的 Tier 体系，OpenFons 需要 Source Channel 抽象
├── 技能标准化：last30days 有 SKILL.md 规范，OpenFons 需要 Skill Manifest
├── 输出标准化：last30days 有固定输出目录，OpenFons 需要 Artifact 规范
└── 可组合性：last30days 支持 --emit 嵌入，OpenFons 需要 CLI 协议设计
```

---

## 💡 二、七大核心学习点详解

### 2.1 渐进式数据源解锁（Progressive Source Unlocking）⭐⭐⭐⭐⭐

#### last30days 的实现

```
Level 1: 零配置 - Reddit(公开 JSON), Hacker News, Polymarket → 40% 质量
Level 2: 浏览器 Cookie 扫描 - X/Twitter → 60% 质量
Level 3: 安装 yt-dlp - YouTube → 80% 质量  
Level 4: ScrapeCreators API - Reddit 评论 + TikTok + Instagram → 100% 质量
Level 5: 可选付费源 - Exa, Brave, Parallel → 增强搜索
```

**配置表**：

| 数据源 | 免费方法 | API 密钥 | 是否需要 | 说明 |
|--------|---------|---------|----------|------|
| Reddit | 公开 JSON | ScrapeCreators | 强烈推荐 | 解锁顶级评论（最有价值内容） |
| X/Twitter | 浏览器 Cookie | xAI API | 否 | Cookie 提供相同质量 |
| YouTube | yt-dlp (brew install) | 无 | 否 | 安装 yt-dlp 即可搜索 |
| Hacker News | 始终免费 | 无 | 否 | 无需配置 |
| Polymarket | 始终免费 | 无 | 否 | 无需配置 |
| Web 搜索 | 无 | Exa | 可选 | 1000 次免费/月 |
| Bluesky | 免费应用密码 | 无 | 可选 | bsky.app 创建 |
| TikTok | 无 | ScrapeCreators | 可选 | 包含在 SC 密钥中 |
| Instagram | 无 | ScrapeCreators | 可选 | 包含在 SC 密钥中 |

#### OpenFons 落地实现

**TypeScript 接口定义**：

```typescript
// packages/contracts/src/source-tier.ts
import { z } from 'zod';

// SourceTier Schema（用于运行时验证）
export const SourceTierSchema = z.object({
  name: z.enum(['Free', 'Community', 'Pro']),
  qualityScore: z.number().min(0).max(100),
  sources: z.array(z.string()),
  estimatedTime: z.string(),
  setupRequired: z.boolean(),
  description: z.string(),
  valueProp: z.string().optional() // 价值主张（可选）
});

export type SourceTier = z.infer<typeof SourceTierSchema>;

// OpenFons 三层数据源定义
export const OPENFONS_SOURCE_TIERS: Record<string, SourceTier> = {
  Free: {
    name: 'Free',
    qualityScore: 40,
    sources: ['public-api', 'rss', 'sitemap'],
    estimatedTime: '1-2 min',
    setupRequired: false,
    description: '基础功能，适合快速验证想法',
    valueProp: '零配置即可用，30 秒内获得初步洞察'
  },
  Community: {
    name: 'Community',
    qualityScore: 70,
    sources: ['public-api', 'rss', 'sitemap', 'browser-automation'],
    estimatedTime: '3-5 min',
    setupRequired: true,
    description: '解锁浏览器自动化，质量提升 75%',
    valueProp: '只需一次设置，获得 3 倍质量提升'
  },
  Pro: {
    name: 'Pro',
    qualityScore: 95,
    sources: [
      'public-api', 
      'rss', 
      'sitemap', 
      'browser-automation', 
      'paid-api', 
      'scraping-service'
    ],
    estimatedTime: '5-8 min',
    setupRequired: true,
    description: '全量数据源，包含付费 API 和专业爬虫服务',
    valueProp: '专业级研究工具，媲美万元咨询报告'
  }
};

// 辅助函数：计算质量分数
export function calculateQualityScore(unlockedSources: string[]): number {
  const tier = Object.values(OPENFONS_SOURCE_TIERS).find(t => 
    t.sources.every(s => unlockedSources.includes(s))
  );
  return tier?.qualityScore ?? 40;
}
```

---

### 2.2 一键式 Setup Wizard ⭐⭐⭐⭐⭐

#### last30days 的魔法体验

```bash
/last30days setup
# 自动执行：
# 1. 扫描浏览器 Cookie（Chrome/Firefox/Safari）
# 2. 检查 yt-dlp 安装
# 3. 30 秒完成，Cookie 仅存内存不上磁盘
```

#### OpenFons 落地实现

**Python 脚本原型** (`scripts/setup-wizard.py`)：

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OpenFons Setup Wizard - 一键式配置工具
功能：浏览器 Cookie 检测、依赖检查、配置文件生成
安全：Cookie 仅存内存，永不落盘
"""
import os
import sys
import shutil
from pathlib import Path
from datetime import datetime

def extract_cookies_from_browsers():
    """从主流浏览器提取 Cookie"""
    browsers = {
        'chrome': {
            'win': Path.home() / 'AppData/Local/Google/Chrome/User Data/Default/Cookies',
            'mac': Path.home() / 'Library/Application Support/Google/Chrome/Default/Cookies',
            'linux': Path.home() / '.config/google-chrome/Default/Cookies'
        },
        'edge': {
            'win': Path.home() / 'AppData/Local/Microsoft/Edge/User Data/Default/Cookies',
            'mac': Path.home() / 'Library/Application Support/Microsoft Edge/Default/Cookies'
        },
        'safari': {
            'mac': Path.home() / 'Library/Cookies/Cookies.binarycookies'
        }
    }
    
    found_cookies = {}
    for browser, paths in browsers.items():
        plat = 'win' if sys.platform == 'win32' else 'mac' if sys.platform == 'darwin' else 'linux'
        cookie_path = paths.get(plat)
        
        if cookie_path and cookie_path.exists():
            print(f"✅ 发现 {browser} Cookie")
            found_cookies[browser] = str(cookie_path)
    
    return found_cookies

def check_dependencies():
    """检查系统依赖"""
    deps = {'node': False, 'python3': False, 'yt-dlp': False, 'pnpm': False}
    
    for dep in deps.keys():
        if shutil.which(dep):
            deps[dep] = True
            print(f"✅ {dep} 已安装")
        else:
            print(f"❌ {dep} 未安装")
    
    return deps

def write_to_env(config_data):
    """写入配置文件（安全模式）"""
    env_dir = Path.home() / '.config/openfons'
    env_dir.mkdir(parents=True, exist_ok=True)
    env_file = env_dir / '.env'
    
    # 如果文件已存在，先备份
    if env_file.exists():
        backup_file = env_file.with_suffix('.env.bak')
        shutil.copy2(env_file, backup_file)
        print(f"ℹ️  已备份原配置文件：{backup_file}")
    
    with open(env_file, 'w', encoding='utf-8') as f:
        f.write("# OpenFons Configuration\n")
        f.write(f"# Generated by Setup Wizard at {datetime.now().isoformat()}\n")
        f.write(f"SETUP_COMPLETE=true\n")
        f.write(f"SETUP_DATE={datetime.now().isoformat()}\n")
        for key, value in config_data.items():
            f.write(f"{key}={value}\n")
    
    # 设置文件权限（Unix-like 系统）
    if sys.platform != 'win32':
        os.chmod(env_file, 0o600)  # 仅所有者可读写
    
    print(f"✅ 配置已保存至：{env_file}")
    print(f"🔒 文件权限已设置为 600（仅所有者可访问）")

def main():
    """主函数：执行完整的设置流程"""
    print("=" * 60)
    print("🔧 OpenFons Setup Wizard")
    print("=" * 60)
    print()
    
    try:
        # 1. 检查 Cookie
        print("📌 步骤 1/3: 检查浏览器 Cookie...")
        cookies = extract_cookies_from_browsers()
        
        # 2. 检查依赖
        print("\n📌 步骤 2/3: 检查系统依赖...")
        deps = check_dependencies()
        
        # 3. 写入配置
        config = {
            'BROWSER_COOKIES_FOUND': 'true' if cookies else 'false',
            'YT_DLP_INSTALLED': 'true' if deps.get('yt-dlp') else 'false',
            'NODE_INSTALLED': 'true' if deps.get('node') else 'false',
            'PNPM_INSTALLED': 'true' if deps.get('pnpm') else 'false'
        }
        write_to_env(config)
        
        # 4. 显示结果
        unlocked_count = len([v for v in config.values() if v == 'true'])
        quality_score = calculate_quality_score(unlocked_count)
        
        print("\n" + "=" * 60)
        print("🎉 设置完成！")
        print("=" * 60)
        print(f"✅ 已解锁 {unlocked_count} 个功能")
        print(f"📊 研究质量从 40% 提升至 {quality_score}%")
        print(f"🚀 现在可以运行：pnpm openfons run \"你的研究主题\"")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 设置过程中发生错误：{e}")
        print("💡 请检查是否有足够的系统权限")
        sys.exit(1)

def calculate_quality_score(unlocked_count: int) -> int:
    """根据解锁的功能数量计算质量分数"""
    if unlocked_count <= 1:
        return 40
    elif unlocked_count <= 2:
        return 60
    elif unlocked_count <= 3:
        return 80
    else:
        return 95

if __name__ == '__main__':
    main()
```

---

### 2.3 SKILL.md 标准规范 ⭐⭐⭐⭐⭐

#### last30days 的技能描述框架

```yaml
---
name: last30days
version: "2.9.6"
description: "Deep research engine covering the last 30 days across 10+ sources"
argument-hint: 'last30 AI video tools, last30 best project management tools'
allowed-tools: Bash, Read, Write, AskUserQuestion, WebSearch
homepage: https://github.com/mvanhorn/last30days-skill
author: mvanhorn
license: MIT
user-invocable: true
metadata:
  openclaw:
    emoji: "📰"
    requires:
      env: [SCRAPECREATORS_API_KEY]
      bins: [node, python3]
    tags: [research, deep-research, reddit, trends, multi-source]
---
```

**关键设计原则**：
- ✅ YAML Front Matter 提供机器可读的元数据
- ✅ argument-hint 降低用户认知负担（提供示例）
- ✅ allowed-tools 明确权限范围
- ✅ metadata 支持市场发现和标签搜索
- ✅ license 清晰声明使用条款

#### OpenFons 落地模板

**创建文件**: `packages/shared/skills/opportunity-analyzer/SKILL.md`

```markdown
---
name: opportunity-analyzer
version: "0.1.0"
description: "将自然语言机会转化为结构化 EvidenceSet - 采集多源数据，生成可盈利的网页报告"
argument-hint: '分析 AI 视频工具市场机会，评估订阅制可行性'
allowed-tools: Bash, Read, Write, FileEdit, AskUserQuestion, WebFetch
homepage: https://github.com/openfons/openfons
repository: https://github.com/openfons/openfons/tree/main/packages/shared/skills/opportunity-analyzer
author: OpenFons Team
license: MIT
user-invocable: true
metadata:
  openfons:
    emoji: "🎯"
    requires:
      bins:
        - node
        - python3
        - pnpm
    optionalEnv:
      - OPENAI_API_KEY
      - ANTHROPIC_API_KEY
      - PLAYWRIGHT_BROWSERS_PATH
    primaryEnv: OPENAI_API_KEY
    files:
      - "src/**/*"
      - "scripts/**/*"
    homepage: https://github.com/openfons/openfons
    tags:
      - opportunity-analysis
      - market-research
      - evidence-collection
      - report-generation
      - monetization
      - subscription-model
      - content-strategy
      - competitive-analysis
  memorytree:
    goals: "Memory/01_goals/"
    todos: "Memory/02_todos/"
    chatLogs: "Memory/03_chat_logs/"
    transcripts: "Memory/06_transcripts/"
---

# opportunity-analyzer v0.1.0: 机会分析与证据采集

> **权限概述**：读取公开网络数据，写入 EvidenceSet 到 `~/.local/share/openfons/out/`，可选保存完整报告到 `~/Documents/OpenFons/`。所有凭证使用和数据处理详见 [安全与权限](#security--permissions)。

将自然语言研究意图转化为结构化的 OpportunitySpec、EvidenceSet 和 ReportSpec，交付可盈利的网页报告。

## Step 0: 首次运行向导

**关键**：即使用户提供了主题，也必须先检查配置文件。如果用户输入 `opportunity-analyzer AI 视频工具`，你必须静默检查 `~/.config/openfons/.env` 是否存在（不要运行 Bash 命令来检测）。如果文件不存在，这是首次运行。

**检测方式**：静默检查文件存在性，不要运行 Bash 命令来检测。如果文件不存在，显示欢迎文本。

👋 欢迎使用 opportunity-analyzer！

我将帮你分析市场机会，采集多源数据，生成可盈利的网页报告。

为了获得最佳结果，我可以：
🔍 **扫描浏览器 Cookie** - 解锁社交媒体数据采集（仅读取，不保存）
📺 **安装 Playwright** - 启用浏览器自动化（Node.js 包）
⭐ **配置 API 密钥** - OpenAI/Anthropic 用于智能分析

我们推荐全部配置 —— 这是发挥威力的关键。无任何回扣。

**调用 AskUserQuestion（仅此问题和选项，不重复欢迎文本）**

问题："如何设置？"
选项：
- "🚀 自动设置（~30 秒）— 扫描浏览器 Cookie + 安装 Playwright"
- "🔧 手动设置 — 查看配置指南"
- "⚡ 跳过 — 使用基础功能开始"

**如果用户选择 1（自动设置）**：
运行设置子命令：
```bash
cd {SKILL_DIR} && python3 scripts/setup-wizard.py
```
向用户展示结果（发现了哪些 Cookie，是否安装了 Playwright）。

**然后显示 ScrapeCreators 推送（纯文本 + 模态框）**：

⭐ 补充一下 — Reddit 评论是互联网最锐利的洞察。高赞回复往往比原帖更有价值。ScrapeCreators 解锁这些（加 TikTok + Instagram）— 100 次免费起步，无需信用卡。

**调用 AskUserQuestion**：
问题："要解锁 Reddit 评论吗？"
选项：
- "打开 scrapecreators.com 获取免费密钥" — 运行 `open https://scrapecreators.com`。然后让用户粘贴 API 密钥。粘贴后写入 `SCRAPECREATORS_API_KEY={key}` 到 ~/.config/openfons/.env
- "我已有密钥 — 直接粘贴" — 接受密钥，写入 .env
- "暂时跳过 — 开始研究" — 不使用 ScrapeCreators 继续

**ScrapeCreators 模态框后（或跳过），显示首个研究主题模态框**：

**调用 AskUserQuestion**：
问题："首次研究什么机会？"
选项：
- "AI 视频生成工具市场" — 技术工具分析
- "订阅制内容变现机会" — 商业模式评估
- "北美利基市场调研" — 地域性机会
- "自定义主题"

如果用户选择示例，用该主题运行研究。如果选择"自定义"，询问具体主题。如果用户原始命令已提供主题（如 `opportunity-analyzer AI 视频工具`），跳过此模态框直接使用用户主题。

**首次运行向导结束**。Step 0 仅在首跑时运行。如果 .env 中存在 `SETUP_COMPLETE=true`，跳过所有 Step 0 — 无欢迎、无设置、无模态框，直接进入 Step 1（解析用户意图）。主题选择器仅限首次用户。

## 安全与权限

### 数据读取
- ✅ 仅读取公开网络数据
- ✅ 浏览器 Cookie 仅存内存，会话结束后立即清除
- ✅ 不保存任何个人身份信息（PII）

### 数据写入
- ✅ 输出到 `~/.local/share/openfons/out/`
- ✅ 可选保存到 `~/Documents/OpenFons/`
- ✅ 所有文件本地存储，不上传云端

### API 密钥管理
- ✅ 存储在 `~/.config/openfons/.env`（Unix 权限 0o600）
- ✅ 永不提交到 Git
- ✅ 永不记录到日志
- ✅ 支持项目级 `.claude/last30days.env` 覆盖

### 网络请求
- ✅ 仅发送 GET 请求（只读操作）
- ✅ 遵守 robots.txt
- ✅ 限速请求（避免被封禁）
```

---

### 2.4 首次运行向导（First-Run Wizard）⭐⭐⭐⭐

#### last30days 的用户引导流程

```
检测逻辑：
1. 静默检查 ~/.config/last30days/.env 是否存在（不运行 Bash 命令）
2. 如果不存在 → 显示欢迎文本（普通消息，非引用块）
3. AskUserQuestion: "如何设置？" 
   - 自动设置（~30 秒）
   - 手动设置（显示指南）
   - 跳过（使用有限功能）
4. 如果选自动 → 运行 setup → 推送 ScrapeCreators
5. ScrapeCreators 推送后 → 问："首次研究什么主题？"（提供示例选项）

关键设计原则：
✅ 用 AskUserQuestion 而非冷冰冰的命令行
✅ 提供预设主题选项降低认知负担
✅ 每一步都有"跳过"选项，不强迫用户
✅ Cookie 仅存内存，明确告知用户"永不保存"
✅ 价值导向文案（"Reddit 评论是互联网最锐利的洞察"）
```

#### OpenFons 落地实现

**React 组件** (`apps/control-web/src/setup-wizard/SetupWizard.tsx`):

```tsx
import React, { useState } from 'react';
import { runSetupScript } from '../utils/setup-runner';

interface SetupStep {
  icon: string;
  title: string;
  desc: string;
}

const WELCOME_STEPS: SetupStep[] = [
  { icon: '🔍', title: '扫描浏览器 Cookie', desc: '解锁社交媒体数据采集（仅读取，永不保存）' },
  { icon: '📺', title: '安装 Playwright', desc: '启用浏览器自动化（Node.js 包）' },
  { icon: '⭐', title: '配置 API 密钥', desc: 'OpenAI/Anthropic 用于智能分析' }
];

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [setupState, setSetupState] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleAutoSetup = async () => {
    setSetupState('running');
    try {
      await runSetupScript();
      setSetupState('success');
      setTimeout(() => onComplete(), 2000); // 成功后自动继续
    } catch (error) {
      setSetupState('error');
      setErrorMessage(error instanceof Error ? error.message : '设置失败');
    }
  };

  return (
    <div className="setup-wizard">
      <h2>👋 欢迎使用 OpenFons!</h2>
      <p>我将帮你分析市场机会，采集多源数据，生成可盈利的网页报告。</p>
      
      <div className="setup-options">
        {WELCOME_STEPS.map((step, index) => (
          <div key={index} className="setup-option">
            <span className="icon">{step.icon}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {setupState === 'running' && (
        <div className="setup-progress">
          <div className="spinner"></div>
          <p>正在自动设置，请稍候...</p>
        </div>
      )}

      {setupState === 'error' && (
        <div className="setup-error">
          <p>❌ {errorMessage}</p>
          <button onClick={() => setSetupState('idle')}>重试</button>
        </div>
      )}

      <div className="action-buttons">
        <button 
          onClick={handleAutoSetup} 
          className="primary"
          disabled={setupState === 'running'}
        >
          🚀 自动设置（~30 秒）
        </button>
        <button onClick={() => showManualGuide()} className="secondary">
          🔧 手动设置
        </button>
        <button onClick={onComplete} className="skip">
          ⚡ 跳过
        </button>
      </div>
    </div>
  );
}
```

---

### 2.5 两阶段搜索架构 ⭐⭐⭐⭐

#### last30days 的技术亮点

```
Phase 1: Discovery Pass（广泛搜索）
  - 关键词扩展 + 同义词扩展
  - 目标：召回率优先
  
Phase 2: Supplemental Search（深度挖掘）
  - 获取评论、点赞等互动指标
  - 目标：准确率优先

Scoring Pipeline:
  ├── 文本相似度 (30%)
  ├── 互动速率 (30%)
  ├── 来源权威性 (15%)
  ├── 跨平台收敛 (15%)
  └── 时间新鲜度 (10%)
```

#### OpenFons 落地实现

**TypeScript 实现** (`packages/domain-models/src/evidence/scorer.ts`):

```typescript
// packages/domain-models/src/evidence/scorer.ts
import { Evidence } from '@openfons/contracts';
import { QuerySpec } from '@openfons/contracts';

export interface ScoringWeights {
  textSimilarity: 0.30;
  engagementVelocity: 0.30;
  sourceAuthority: 0.15;
  crossPlatformConvergence: 0.15;
  temporalRecency: 0.10;
}

export interface EvidenceScore {
  overall: number;
  breakdown: {
    textSimilarity: number;
    engagementVelocity: number;
    sourceAuthority: number;
    crossPlatformConvergence: number;
    temporalRecency: number;
  };
}

export class EvidenceScorer {
  private readonly weights: ScoringWeights = {
    textSimilarity: 0.30,
    engagementVelocity: 0.30,
    sourceAuthority: 0.15,
    crossPlatformConvergence: 0.15,
    temporalRecency: 0.10
  };

  private readonly SOURCE_AUTHORITY: Record<string, number> = {
    'reddit': 0.8,
    'hacker-news': 0.9,
    'twitter': 0.6,
    'youtube': 0.7,
    'academic-paper': 1.0,
    'official-docs': 0.95
  };

  score(evidence: Evidence, query: QuerySpec): EvidenceScore {
    const textScore = this.computeTextSimilarity(evidence, query);
    const engagementScore = this.normalizeEngagement(evidence);
    const authorityScore = this.getSourceAuthority(evidence.source);
    const convergenceScore = this.detectCrossPlatformConvergence(evidence);
    const recencyScore = this.computeTemporalDecay(evidence.timestamp);

    const overall = 
      textScore * this.weights.textSimilarity +
      engagementScore * this.weights.engagementVelocity +
      authorityScore * this.weights.sourceAuthority +
      convergenceScore * this.weights.crossPlatformConvergence +
      recencyScore * this.weights.temporalRecency;

    return { 
      overall, 
      breakdown: { 
        textScore, 
        engagementScore, 
        authorityScore, 
        convergenceScore, 
        recencyScore 
      } 
    };
  }

  private computeTextSimilarity(evidence: Evidence, query: QuerySpec): number {
    // TODO: 实现双向文本匹配 + 同义词扩展
    return 0.8; // 占位符
  }

  private normalizeEngagement(evidence: Evidence): number {
    // 互动速率 = (点赞 + 评论*2 + 分享*3) / 发布小时数^0.5
    const ageHours = (Date.now() - evidence.timestamp.getTime()) / (1000 * 60 * 60);
    const rawEngagement = 
      (evidence.metrics?.likes || 0) + 
      (evidence.metrics?.comments || 0) * 2 + 
      (evidence.metrics?.shares || 0) * 3;
    return Math.min(1.0, rawEngagement / Math.sqrt(Math.max(1, ageHours)));
  }

  private getSourceAuthority(source: string): number {
    return this.SOURCE_AUTHORITY[source] || 0.5;
  }

  private detectCrossPlatformConvergence(
    evidence: Evidence, 
    allEvidence?: Evidence[]
  ): number {
    if (!allEvidence) return 0.5;
    
    // 检测相同主题在不同平台出现
    const similarContent = allEvidence.filter(e => 
      e.id !== evidence.id && 
      this.textSimilarity(e.content, evidence.content) > 0.8
    );
    
    const platformCount = new Set(similarContent.map(e => e.source)).size;
    return Math.min(1.0, platformCount / 3); // 最多 3 个平台得满分
  }

  private computeTemporalDecay(timestamp: Date): number {
    const daysOld = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
    const halfLife = 7; // 半衰期 7 天
    return Math.pow(0.5, daysOld / halfLife);
  }

  private textSimilarity(a: string, b: string): number {
    // TODO: 实现 Jaccard 相似度或余弦相似度
    return 0.5;
  }
}
```

---

### 2.6 输出产物标准化 ⭐⭐⭐⭐

#### last30days 的输出文件结构

```
~/.local/share/last30days/out/
├── report.md              # 人类可读完整报告
├── report.json            # 结构化数据（含评分）
├── last30days.context.md  # 紧凑片段供复用
├── raw_openai.json        # 原始 API 响应
└── raw_xai.json           # 原始 API 响应
```

#### OpenFons 落地实现

**Artifact 类型定义** (`packages/contracts/src/artifact.ts`):

```typescript
// packages/contracts/src/artifact.ts
import { z } from 'zod';
import { ReportSpecSchema } from './report-spec';
import { EvidenceSetSchema } from './evidence-set';
import { OpportunitySpecSchema } from './opportunity-spec';

// 运行产物集合
export const RunArtifactsSchema = z.object({
  // 人类可读
  reportMarkdown: z.string(),
  executiveSummary: z.string(),
  
  // 机器可读
  reportJSON: ReportSpecSchema,
  evidenceSet: EvidenceSetSchema,
  opportunitySpec: OpportunitySpecSchema,
  
  // 紧凑片段（供其他技能引用）
  evidenceContext: z.string(),
  opportunityContext: z.string(),
  
  // 原始数据（审计用）
  rawCollection: z.array(z.any()), // CollectionLog[]
  metadata: z.object({
    runId: z.string(),
    topic: z.string(),
    startedAt: z.coerce.date(),
    completedAt: z.coerce.date(),
    durationMs: z.number(),
    sourcesUsed: z.array(z.string()),
    totalEvidenceCount: z.number()
  })
});

export type RunArtifacts = z.infer<typeof RunArtifactsSchema>;

// Artifact Manager 接口
export interface IArtifactManager {
  initialize(): Promise<void>;
  saveReport(report: ReportSpec): Promise<void>;
  saveEvidenceSet(evidenceSet: EvidenceSet): Promise<void>;
  saveOpportunitySpec(opportunity: OpportunitySpec): Promise<void>;
  saveRawCollection(collectionLogs: any[]): Promise<void>; // CollectionLog[]
  getOutputDir(): string;
}

// 输出目录结构
export const OUTPUT_STRUCTURE = {
  humanReadable: {
    'report.md': '完整人类可读报告',
    'summary.md': '执行摘要（1 页纸）'
  },
  machineReadable: {
    'report.json': '结构化数据',
    'evidence-set.json': '证据集合',
    'opportunity-spec.json': '机会定义'
  },
  contextSnippets: {
    'evidence.context.md': '紧凑证据片段',
    'opportunity.context.md': '紧凑机会片段'
  },
  raw: {
    'raw_collection.json': '原始采集日志',
    'metadata.json': '运行元数据'
  }
} as const;
```

---

### 2.7 嵌入式技能调用协议 ⭐⭐⭐

#### last30days 的可组合性设计

```bash
# 方式 1: 内联注入
!python3 ~/.claude/skills/last30days/scripts/last30days.py "topic" --emit=context

# 方式 2: 读取文件
!cat ~/.local/share/last30days/out/last30days.context.md

# 方式 3: 获取路径
CONTEXT_PATH=$(python3 ... --emit=path)
cat "$CONTEXT_PATH"

# 方式 4: JSON 编程使用
python3 ... --emit=json > research.json
```

#### OpenFons 落地实现

**CLI 设计** (`apps/cli/src/commands/run.ts`):

```typescript
const runCommand = new Command('run')
  .description('运行机会分析工作流')
  .argument('<topic>', '研究主题')
  .option('-e, --emit <mode>', '输出模式', 'compact')
  .option('-s, --sources <mode>', '数据源选择', 'auto')
  .option('-d, --days <number>', '时间窗口（天）', '30')
  .action(async (topic: string, options: any) => {
    const result = await runner.run(topic, options);
    
    switch (options.emit) {
      case 'compact': console.log(result.compactContext); break;
      case 'json': console.log(JSON.stringify(result.report)); break;
      case 'md': console.log(result.markdown); break;
      case 'path': console.log(result.outputDir); break;
    }
  });
```

**使用示例**:

```bash
# 在其他技能中内联调用
!pnpm openfons run "AI 视频工具市场" --emit=context

# JSON 格式供脚本处理
pnpm openfons run "市场分析" --emit=json > analysis.json

# 管道组合
pnpm openfons run "竞品分析" --emit=json | jq '.findings[] | select(.heatScore > 80)'
```

---

## 🚀 三、立即可以落地的 5 个行动项

### 优先级 1：Setup Wizard（本周可做）

**目标**: 实现一键式设置向导

**任务分解**:
- [ ] 创建 `scripts/setup-wizard.py`
- [ ] 实现浏览器 Cookie 检测（Chrome/Edge/Safari/Firefox）
- [ ] 实现依赖检查（Node.js/pnpm/Playwright）
- [ ] 创建 PowerShell 版本（Windows 用户）
- [ ] 集成到 control-web（React 组件）
- [ ] 编写单元测试

**预计工时**: 2-3 天

**验收标准**:
- ✅ 用户在 30 秒内完成设置
- ✅ Cookie 仅存内存，明确告知用户
- ✅ 显示"质量从 X% 提升至 Y%"的反馈
- ✅ 支持跳过，不强迫用户

---

### 优先级 2：SKILL.md 模板（今天可做）

**目标**: 为 OpenFons Skills 创建标准化元数据规范

**任务分解**:
- [ ] 设计 YAML Front Matter 必需字段
- [ ] 创建 `packages/shared/skills/opportunity-analyzer/SKILL.md`
- [ ] 编写 SKILL.md 编写指南
- [ ] 提供复制粘贴模板

**预计工时**: 4-6 小时

---

### 优先级 3：Source Tier 设计（本周可做）

**目标**: 定义清晰的三层数据源体系

**任务分解**:
- [ ] 创建 `packages/contracts/src/source-tier.ts`
- [ ] 定义 Free/Community/Pro 三层
- [ ] 为每个 Tier 写价值主张文案
- [ ] 创建 UI 组件 `SourceTierCard.tsx`
- [ ] 集成到 control-web 设置页面

**预计工时**: 1-2 天

---

### 优先级 4：输出目录结构（明天可做）

**目标**: 标准化每次运行的输出产物

**任务分解**:
- [ ] 创建 `apps/control-api/src/services/artifact-manager.ts`
- [ ] 实现 report.md 渲染器
- [ ] 实现 report.json 序列化
- [ ] 实现 compact context 提取
- [ ] 编写单元测试

**预计工时**: 1 天

---

### 优先级 5：两阶段采集原型（下周可做）

**目标**: 实现 Discovery → Enrichment 两阶段采集流水线

**任务分解**:
- [ ] 创建 `packages/domain-models/src/collection/two-pass-collector.ts`
- [ ] 实现 Discovery Pass（广泛搜索）
- [ ] 实现 Enrichment Pass（深度挖掘）
- [ ] 实现复合评分算法
- [ ] 编写集成测试

**预计工时**: 3-4 天

---

## 📋 四、架构差异与 OpenFons 护城河

### 4.1 核心差异对比表

| 方面 | last30days-skill | OpenFons (差异化) |
|------|------------------|-------------------|
| **目标** | 快速研究报告 | 可盈利的网页报告 + 机会识别 |
| **证据链** | 引用链接为主 | EvidenceSet（完整采集日志 + 原始数据） |
| **执行模型** | Python 脚本 | Agent 编译 + Worker 执行的统一模型 |
| **记忆系统** | 保存到 ~/Documents | MemoryTree（goals/todos/chat_logs/transcripts） |
| **可扩展性** | 单一技能 | Monorepo + 插件化 Skills |
| **变现导向** | 无明确商业模式 | 直接支持订阅/工具/视频机会识别 |

### 4.2 OpenFons 的四大护城河

#### 护城河 1：EvidenceSet 真源保护

不只是引用链接，而是完整快照：
- ✅ 可审计：随时回放采集时的完整状态
- ✅ 可验证：不是断章取义，而是全貌呈现
- ✅ 可复用：下游任务可直接使用原始数据

#### 护城河 2：OpportunitySpec 商业嗅觉

自动生成变现机会：
- ✅ 检测订阅机会（高频询问"有没有教程/服务"）
- ✅ 检测工具机会（抱怨重复手工操作）
- ✅ 检测内容机会（愿意付费的明确表述）

#### 护城河 3：MemoryTree 状态管理

跨会话追踪目标和进展：
- ✅ 长期记忆：不会每次对话都失忆
- ✅ 目标导向：围绕用户目标组织工作
- ✅ 可追溯：决策历史清晰可查

#### 护城河 4：统一执行模型

Skill / Web UI / API 三端一致：
- ✅ 一致性：无论通过何种方式调用，行为完全一致
- ✅ 可测试：每个阶段独立测试
- ✅ 可扩展：新增数据源只需实现 Collector 接口

---

## 🎓 五、推荐学习资源

### 5.1 核心资料

1. **last30days-skill 官方仓库**
   - URL: https://github.com/mvanhorn/last30days-skill
   - 重点文件：`SKILL.md`, `SPEC.md`, `scripts/last30days.py`, `scripts/lib/`

2. **ClawHub 生态系统**
   - URL: https://clawhub.ai
   - 学习点：500+ skills 如何被发现和安装

3. **相关讨论文章**
   - [Best Openclaw Skills You Should Install](https://www.reddit.com/r/AI_Agents/comments/1r2u356/)
   - [Skill is now first class citizen](https://kenhuangus.substack.com/p/skill-is-now-first-class-citizen)

### 5.2 延伸学习

- **AI Agent 设计模式**: https://github.com/awesome-claude-code-subagents
- **Claude Code Skills 开发指南**: https://docs.anthropic.com/claude-code/
- **MemoryTree 规范**: 参考本项目 `agents.md` 文件

---

## 💬 六、行动建议总结

### 立即做（本周）

1. ✅ **实现 Setup Wizard 原型**
   - Python 版本 + PowerShell 版本
   - 浏览器 Cookie 检测
   - 依赖自动安装

2. ✅ **定义 SKILL.md 模板**
   - YAML Front Matter 规范
   - 创建 3 个示例技能
   - 编写指南文档

3. ✅ **设计 Source Tier 体系**
   - TypeScript 类型定义
   - UI 组件开发
   - 价值文案打磨

### 接下来两周

4. ✅ **标准化输出目录结构**
   - Artifact Manager 实现
   - Markdown 渲染器
   - 类型定义完善

5. ✅ **实现两阶段采集原型**
   - Discovery Pass → Enrichment Pass
   - 复合评分算法
   - 跨平台去重

### 战略层面坚持

- ✅ **渐进式解锁**而非"全有或全无"
- ✅ **零配置可用**的低门槛
- ✅ **用数据说话**（"质量提升 40%→80%"）
- ✅ **设计可组合性**（支持 --emit 嵌入）
- ✅ **价值导向文案**（"Reddit 评论是互联网最锐利的洞察"）

---

## 🚨 七、避坑指南

### 7.1 last30days 踩过的坑

1. **Cookie 安全争议**
   - 解决：明确告知"仅存内存，永不落盘"

2. **API 密钥推荐嫌疑**
   - 解决：公开声明"last30days receives no money from any API provider"

3. **首次运行认知负担**
   - 解决：Wizard 引导 + 预设主题选项

4. **长时间等待焦虑**
   - 解决：实时进度显示 + "--quick mode"选项

### 7.2 OpenFons 应避免的坑

1. ❌ **不要过度设计初期架构** - 先 MVP 再扩展
2. ❌ **不要忽视 Windows 用户** - PowerShell 与 Python 同等重要
3. ❌ **不要一次性实现所有 Tier** - 先做好 Free Tier
4. ❌ **不要忽略文案打磨** - 数据比形容词更有说服力

---

## 🔮 八、未来演进方向

### 8.1 OpenFons 路线图

**Phase 1（Q2 2026）**: 基础能力
- Setup Wizard + Source Tiers
- EvidenceSet 真源保护
- 单一技能（opportunity-analyzer）

**Phase 2（Q3 2026）**: 商业化能力
- OpportunitySpec 自动生成
- 变现机会识别（订阅/工具/视频）
- 网页报告渲染

**Phase 3（Q4 2026）**: 生态建设
- Skills 市场（ClawHub 集成）
- MemoryTree 完整实现
- 心跳进程自动同步

**Phase 4（2027）**: 平台化
- 第三方开发者 SDK
- 自定义数据源插件
- 企业级权限管理

---

## 📝 九、检查清单

### 9.1 Setup Wizard 检查清单

- [ ] 支持 Chrome/Edge/Safari/Firefox
- [ ] Cookie 提取不写入磁盘
- [ ] 依赖检查（Node.js/pnpm/Playwright）
- [ ] 自动安装缺失依赖
- [ ] 生成 `~/.config/openfons/.env`
- [ ] 显示"质量从 X% 提升至 Y%"
- [ ] 支持跳过选项
- [ ] 中英文双语支持

### 9.2 SKILL.md 检查清单

- [ ] YAML Front Matter 完整
- [ ] name/version/description 准确
- [ ] argument-hint 提供示例
- [ ] allowed-tools 白名单合理
- [ ] metadata.openfons 命名空间完整
- [ ] Step 0 首跑向导逻辑清晰
- [ ] 安全与权限说明充分

### 9.3 Source Tier 检查清单

- [ ] Free/Community/Pro 三层定义清晰
- [ ] 每层质量分数量化（40%/70%/95%）
- [ ] 数据源列表具体
- [ ] 预计耗时合理
- [ ] 价值主张文案打动人
- [ ] UI 组件直观展示差异

---

## 🙏 致谢

感谢 last30days-skill 作者 [@mvanhorn](https://github.com/mvanhorn) 开源如此优秀的项目，为 AI Agent 技能开发树立了标杆。

本文档由 OpenFons 团队整理，旨在吸收业界最佳实践，打造更强大的开源情报工作流平台。

---

**文档版本**: v1.2  
**最后更新**: 2026-03-30  
**维护者**: OpenFons Team  
**许可证**: MIT  
**审查记录**: 
- Round 1: 代码示例完善、安全性增强、结构优化
- Round 2: TypeScript 类型增强、Zod 运行时验证、错误处理完善
