# oh-my-harness

oh-my-harness 是基于 pnpm workspace 的 AI 开发工作台。当前仓库包含浏览器端聊天应用，以及供应用直接消费的本地 UI Pro vendor 包。

## Workspace

```text
oh-my-harness/
├── apps/
│   └── web/
│       └── src/
│           ├── app/                 应用装配、布局与路由状态
│           ├── components/          无业务语义的 UI 与 assistant-ui primitives
│           ├── features/
│           │   ├── chat/            Composer、消息、导航、工作区与 mock 会话
│           │   ├── settings/        设置弹窗、模型、插件与设置状态
│           │   └── trace/           Agent 轨迹视图、类型和工具函数
│           ├── pages/               路由级页面
│           ├── lib/                 小型通用函数
│           └── styles/              全局样式与应用外壳样式
├── packages/
│   └── ui-pro/                      已编译的本地 vendor 包，不在应用重构范围
├── package.json
└── pnpm-workspace.yaml
```

每套页面、组件或功能模块通过显式 `index.ts` 暴露公共 API；模块内部直接引用具体文件，跨模块消费者从公共索引导入。Feature 业务组件统一放入所属模块的 `components/`，该目录只包含 `.tsx` 和 `index.ts`；跨文件或公共契约类型由对应 `types/` 维护，组件私有 Props 与局部类型留在 TSX 内。数据、Context、工具函数与测试分别进入对应职责目录。只有真实跨功能复用的无业务基础组件进入根级 `components/ui`。

## Commands

```bash
pnpm dev
pnpm format
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

当前会话、模型、插件和 Trace 数据均为只读或页面会话级 mock。真实 Agent runtime、连接和持久化必须位于浏览器外的 Agent API 边界。
