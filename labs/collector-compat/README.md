# Collector Compatibility Lab

这个目录用于验证 OpenFons 第一阶段的采集相关开源工具是否可以在当前环境中安装、导入、最小调用与后续复用。

## 目标

1. 把“文档选型”变成“真实兼容性验证”。
2. 优先验证北美 niche 内容采集直接相关的工具。
3. 区分“可直接复用”“可局部借鉴”“可安装但不适合作为主线依赖”“需要重服务或账号条件”的工具。
4. 对关键仓库级项目做单独安装与启动链路验证，而不只看 PyPI / npm 包。

## 当前批次

### Node / npm

- `crawlee`
- `playwright`
- `ytdlp-exec`
- `ytcog`
- `firecrawl`
- `pinchtab`

### Python / uv

- `camoufox`
- `scrapling`
- `twscrape`
- `TikTokApi`
- `praw`
- `facebook-scraper`
- `youtube-comment-downloader`
- `gallery-dl`
- `ddgs`
- `ddddocr`
- `python-amazon-paapi`

### Repo / 手工验证

- `NanmiCoder/MediaCrawler`

## 验证原则

1. 先做安装与导入级 smoke test。
2. 再做最小调用级 smoke test。
3. 对需要 API key、cookie、账号、代理、浏览器二进制或 Docker 服务的工具，单独标注前置条件。
4. 不把验证通过等同于适合生产。

## 目录说明

- `package.json`: Node 侧依赖与脚本
- `requirements.txt`: Python 侧依赖清单
- `scripts/smoke-node.mjs`: Node 冒烟脚本
- `scripts/smoke-python.py`: Python 冒烟脚本
- `scripts/smoke-sources.py`: 平台级来源与仓库级脚本冒烟
- `scripts/smoke-platforms-node.mjs`: YouTube 等 Node 平台测试
- `scripts/smoke-platforms-python.py`: Reddit / TikTok / X / Facebook 等平台测试
- `scripts/smoke-scrapling.py`: Scrapling 反检测采集框架测试
- `results/compatibility-matrix.md`: 人工维护的验证矩阵
- `repos/`: 外部仓库级验证对象的本地克隆目录

## 运行方式

### Node

```powershell
cd labs/collector-compat
npm install
npm run smoke:node
```

### Python

```powershell
cd labs/collector-compat
uv venv .venv --python 3.12
uv pip install -r requirements.txt
.venv\Scripts\python.exe scripts\smoke-python.py
.venv\Scripts\python.exe scripts\smoke-sources.py
$env:PATH='C:\Users\ai\AppData\Roaming\uv\python\cpython-3.12-windows-x86_64-none;'+$env:PATH
node scripts\smoke-platforms-node.mjs
.venv\Scripts\python.exe scripts\smoke-platforms-python.py
.venv\Scripts\python.exe scripts\smoke-scrapling.py
```

### Scrapling 专项验证

```powershell
cd labs/collector-compat
uv pip install scrapling curl_cffi
.venv\Scripts\python.exe scripts\smoke-scrapling.py
```

### 仓库级项目

```powershell
cd labs/collector-compat\repos\MediaCrawler
uv sync
uv run playwright install
uv run main.py --help
uv run main.py --init_db sqlite
uv run python -c "from fastapi.testclient import TestClient; from api.main import app; print(TestClient(app).get('/api/health').json())"
```
