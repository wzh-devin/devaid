---
title: "Pi AI 模型接入摘要"
type: feature-summary
project: devaid
feature: pi-ai-integration
status: implemented
updated: 2026-08-27
tags:
  - feature/pi-ai
  - status/implemented
---

# Pi AI 模型接入摘要

## 当前实现

- Server 的 HTTP 适配位于 `apps/server/src/controller/llm/` 与 `apps/server/src/router/llm/`。
- Provider、模型、OAuth、凭据与配置能力位于 `packages/llm/src/`。
- HTTP DTO 位于 `apps/server/src/dto/llm/`，Web VO 位于对应设置 feature，LLM 包维护自身领域类型。
- HTTP 契约包括 `/api/health`、`/api/ai/providers`、`/api/ai/oauth/*` 与 `/api/ai/completions/stream`。
- 凭据和 Provider 配置由服务端持久化；凭据不返回 Web，文件权限、原子写入和日志脱敏必须保持。
- Provider、认证方式和模型由服务端白名单校验；SSE 请求支持客户端中止。

## 已有验证基线

2026-08-27 Monorepo 重构后验证包括类型检查、构建、LLM 6 项测试、Server 4 项路由测试、Web 19 项测试、lint 与格式检查通过；两条本地 HTTP 路径的 JMeter 对比均为 1,000 个正式样本、0 错误。第三方 OAuth/模型真实端到端未在本次结构重构中重新执行。

## 后续结构调整

非 HTTP 的 LLM 能力已迁移为 `@devaid/llm`，Server 的 Hono Router、Controller 与 DTO 已分离，Web 自持 VO；不再保留共享 `protocol` 包。实现与验证证据见 [[../monorepo-core-architecture/summary]]。
