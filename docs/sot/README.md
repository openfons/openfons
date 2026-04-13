# Source Of Truth

`docs/sot` 保存跨阶段通用、需要长期稳定引用的总纲文档。

这里的文档不归属于单一阶段，而是作为长期真源使用，例如：
- 正式架构总纲
- 技术团队总纲
- 投资人总纲
- 后续若继续抽离的统一契约或平台边界说明

截至 `2026-04-13`，本目录已开始同步 `v010-v012` 之后的真实平台状态，重点纳入：
- `AI procurement` 单案例 `artifact delivery`
- `platform plugin config center` 的读写与 operator closure
- `search-gateway`、browser runtime 与 crawler route resolution 的现状
- `external-blocked` 仍依赖真实外部条件的边界

## 推荐阅读顺序

1. 先看 `开放源平台当前正式架构说明.md`，这是当前项目状态与正式边界的第一真源。
2. 再看 `开放源平台技术团队说明.md`，用来对齐工程栈、阶段判断和技术边界。
3. 再看 `开放源平台投资人说明.md`，用来对齐对外叙事与商业口径。
4. 如果需要理解“为什么现在切到这个阶段”，再看 `docs/workbench/openfons-v001-v012-evolution-summary.md` 与 `docs/workbench/openfons-v013-sot-gap-and-next-scope-decision-2026-04-13.md`。

## 使用规则

1. 当已合并代码与 SoT 冲突时，以已合并代码为准，再回头修 SoT。
2. 当 `workbench` 或 `Memory` 与 SoT 冲突时，以 SoT 为准；但如果 SoT 明显落后于已合并代码，应优先同步 SoT，而不是继续放大偏差。
3. `docs/history/**` 用于解释来路，不自动代表当前现状。
