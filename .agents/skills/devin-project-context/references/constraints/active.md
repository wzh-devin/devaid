---
title: "活动项目约束"
type: project-constraints
project: devaid
next_id: 12
updated: 2026-08-27
tags:
  - project/constraints
  - status/active
---

# 活动项目约束

## PRJ-0003

- **状态**：active
- **约束**：所有架构、功能与重构设计必须先形成可审查的设计文档；设计确认后，必须再次获得明确的实现授权，才能修改业务代码。
- **来源**：2026-08-20 用户确认的项目工作流。
- **适用范围**：规划、设计、重构与功能实现。

## PRJ-0005

- **状态**：active
- **约束**：项目特有约束、功能摘要和设计文档统一存放在 `.agents/skills/devin-project-context/`；旧 `.devin-project-harness/` 仅作为历史资料读取，不再写入。
- **来源**：2026-08-27 用户明确要求使用最新 `.agents/skills` 路径。
- **适用范围**：项目上下文和设计文档落库。

## PRJ-0006

- **状态**：active
- **约束**：项目文档使用 Obsidian Markdown；必须包含有效 frontmatter，并优先使用相对 wikilink 连接约束、摘要与详细设计。
- **来源**：既有项目文档规范。
- **适用范围**：`.agents/skills/devin-project-context/references/` 下的 Markdown 文档。

## PRJ-0007

- **状态**：active
- **约束**：`packages/ui-pro` 是外部同步的 UI 资产包，除非任务明确要求，不修改其源码、导出结构和生成产物。
- **来源**：既有 UI Pro 集成约束。
- **适用范围**：前端实现、构建与依赖调整。

## PRJ-0008

- **状态**：active
- **约束**：访问令牌、OAuth 凭据和其他敏感数据不得进入 Web 持久化状态、日志、URL 或 API 响应；服务端持久化必须保持最小权限、原子写入和日志脱敏。
- **来源**：Pi AI 接入安全设计。
- **适用范围**：认证、凭据、日志、存储与 API。

## PRJ-0009

- **状态**：active
- **约束**：Provider、模型与认证方式由服务端白名单校验；客户端输入不得直接决定模块加载、文件路径或任意 Provider 配置。
- **来源**：Pi AI 接入安全设计。
- **适用范围**：LLM Provider、模型选择、OAuth 与完成请求。

## PRJ-0010

- **状态**：active
- **约束**：涉及状态、持久化、审批、安全边界或跨包依赖的设计，必须明确状态归属、失败路径、恢复策略、兼容性、回滚和验证方式；未确认的部分必须标为 deferred，不得用空壳代码代替决策。
- **来源**：既有项目设计门禁。
- **适用范围**：Agent Runtime、Tools、Policy、LLM、协议和后端重构。

## PRJ-0011

- **状态**：active
- **约束**：Monorepo 采用“应用负责装配、包负责能力”的边界：`apps/web` 与 `apps/server` 是可执行应用；Hono 仅存在于 Server；Server 使用 `router -> controller -> packages` 调用方向。HTTP DTO 由 `apps/server/src/dto/` 维护，Web VO 由对应前端 feature 维护，核心 Packages 只暴露领域类型和能力，当前不建立共享 `protocol` 包。核心能力按 `llm`、未来有真实实现时的 `agent-runtime`、`agent-tools`、`agent-policy` 分包，包内继续按职责分目录。Packages 不得依赖 Apps、Hono、Server DTO 或 Web VO，不创建没有真实实现的占位包，不新增 `core/shared/common/utils/storage` 等模糊兜底包。跨包只使用公开导出，包内使用直接导入，根 `index.ts` 只声明稳定公共 API。
- **来源**：2026-08-27 用户确认的 Monorepo 核心架构方案；同日进一步确认移除 `packages/protocol`，采用 Server DTO 与 Web VO 分治。
- **适用范围**：目录结构、依赖方向、Server 分层与 Workspace 包设计。
- **详细设计**：[[../features/monorepo-core-architecture/design]]
