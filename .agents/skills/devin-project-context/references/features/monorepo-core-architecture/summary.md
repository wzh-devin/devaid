---
title: "Monorepo 核心架构重构摘要"
type: feature-summary
project: devaid
feature: monorepo-core-architecture
status: implemented
created: 2026-08-27
updated: 2026-08-27
tags:
  - feature/architecture
  - status/implemented
---

# Monorepo 核心架构重构摘要

> [!important] 当前状态
> 临时共享协议包已移除，类型边界已收敛为 Server DTO、Web VO 与 LLM 领域类型。Runtime、Tools、Policy 继续保持 deferred。

## 已确认边界

- `apps/web`、`apps/server` 只负责可执行应用和装配。
- Server 保留 Hono，并采用 `router -> controller -> packages` 分层。
- HTTP DTO 归属 `apps/server/src/dto/`，Web VO 归属对应前端 feature；当前不保留共享 `protocol` 包。
- 核心包目标为 `llm`、未来有真实实现时的 `agent-runtime`、`agent-tools`、`agent-policy`；`ui-pro` 保持现状。
- Policy 独立于 Tools，作为 Runtime 与 Tools 共用的权限和安全决策边界。
- 包内按职责分目录，不使用模糊的 `core/shared/common/utils/storage` 兜底目录。
- 不创建空占位包；本轮保留有真实实现的 `llm`，Runtime、Tools、Policy 等到真实能力进入范围后再创建。

## 行为不变量

现有 HTTP 路由、DTO、Provider 白名单、模型校验、OAuth、SSE 中止以及凭据/配置存储格式均保持兼容。详细目录、依赖、迁移阶段、风险与验收见 [[design]]。

## 最新验证

- `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm format:check` 与 `git diff --check` 通过。
- LLM 6 项、Server 4 项、Web 19 项测试全部通过。
- `@devaid/protocol`、`packages/protocol` 与 Package 反向依赖扫描无残留。
- JMeter 5.6.3 两轮 Provider/Health 对照共 4,000 个正式样本，错误率均为 0%；详见 [[performance/2026-08-27-1550-performance]]。
- 最终质量评分 100/100；详见 [[reviews/2026-08-27-1552-review]]。

## 待后续确认

Agent Session/Run 协议、会话持久化、审批 API、事件回放、并发与恢复策略尚未定稿，不属于本次目录重构的实现范围。

## 深层资料

- [[design]]
- [[reviews/2026-08-27-1552-review]]
- [[performance/2026-08-27-1550-performance]]
