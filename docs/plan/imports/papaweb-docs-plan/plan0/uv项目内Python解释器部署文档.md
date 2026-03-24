# uv 项目内 Python 解释器部署文档

版本：v1  
日期：2026-03-13  
适用范围：`D:\demo1\papaweb`

## 1. 目标

通过 `uv` 在项目目录内安装并固定 Python 解释器，避免依赖系统全局 Python。

## 2. 目录约定

- 项目内解释器安装目录：`./.uv/python`
- 不提交到 Git（已在 `.gitignore` 中忽略 `/.uv/`）

## 3. 前置条件

1. 已安装 `uv`（验证命令：`uv --version`）
2. 网络可访问 Python 下载源

## 4. 安装命令（在项目根目录执行）

```powershell
cd D:\demo1\papaweb
uv python install 3.12 --install-dir ./.uv/python --no-registry
```

说明：

1. `3.12` 表示安装 Python 3.12 最新可用补丁版本。
2. `--install-dir ./.uv/python` 强制安装到项目目录内。
3. `--no-registry` 避免向 Windows 注册表写入全局解释器。

## 5. 验证命令

```powershell
cd D:\demo1\papaweb
$py = Get-ChildItem .\.uv\python -Recurse -Filter python.exe | Select-Object -First 1 -ExpandProperty FullName
& $py --version
```

预期：输出 `Python 3.12.x`。

## 6. 后续使用建议

1. 运行 Python 命令时，优先显式使用项目内解释器路径。
2. 若后续需要统一虚拟环境，可在项目内继续使用 `uv venv` 基于该解释器创建环境。
