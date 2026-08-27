---
name: devin-project-context
description: Devaid 项目级约束、当前架构决策与功能设计索引。用于规划、实现、重构、调试和审查本项目时加载稳定上下文。
---

# Devaid Project Context

执行项目任务时按需读取以下内容：

1. 先读取 `references/constraints/active.md`，应用全部活动约束。
2. 再读取 `references/index.md`，按关键词定位相关功能摘要。
3. 仅在任务需要实现细节或决策依据时，继续读取摘要链接的 `design.md`。
4. `references/constraints/history.md` 只用于追溯已废弃约束，不作为当前规则。

本 Skill 只保存项目特有上下文；通用执行流程仍由 `$devin-project-harness` 管理。
