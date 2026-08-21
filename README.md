# Devaid

pnpm workspace monorepo for the Vite chat UI and future AI runtime packages.

## Workspace

```text
devaid/
├── apps/
│   └── web/
│       ├── src/
│       │   ├── app/                       application entry and shell
│       │   │   ├── App.tsx
│       │   │   └── ChatLayout.tsx
│       │   ├── pages/
│       │   │   └── new-chat/
│       │   │       └── NewChatPage.tsx   route-level page composition
│       │   ├── features/
│       │   │   └── chat/
│       │   │       ├── components/       chat-only UI and interactions
│       │   │       └── chat-data.ts      read-only mock data
│       │   ├── styles/
│       │   │   └── globals.css
│       │   └── main.tsx
│       ├── index.html
│       └── vite.config.ts
├── packages/                             reserved; no speculative packages
├── package.json
└── pnpm-workspace.yaml
```

Complete pages live in `pages`, domain components live with their feature,
and application-wide composition lives in `app`. Add a shared package only
after at least two real consumers establish its contract.

## Commands

```bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm build
```

The current chat data is read-only mock content. Runtime sessions and Pi Agent integration belong behind a future Agent API, not in the browser source tree.
