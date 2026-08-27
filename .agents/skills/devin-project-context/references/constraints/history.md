---
title: "历史项目约束"
type: project-constraints-history
project: devaid
updated: 2026-08-27
tags:
  - project/constraints
  - status/history
---

# 历史项目约束

## PRJ-0001

- **状态**：superseded
- **原约束**：只有同时存在跨应用或跨运行时消费者时，才将能力提升为 Workspace Package；不得预建空的 Runtime 包。
- **废弃原因**：已确认采用“应用负责装配、包负责能力”的 Monorepo 边界。仍保留“不创建空占位包”的原则，但 Package 的成立依据改为稳定能力边界，而不再要求必须已有多个消费者。
- **替代约束**：[[active#PRJ-0011]]
- **更新时间**：2026-08-27
