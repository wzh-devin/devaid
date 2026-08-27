import { serve } from '@hono/node-server'

import { createApp } from './app.ts'

const hostname = '127.0.0.1'
const port = Number(process.env.DEVAID_SERVER_PORT ?? 4318)
const server = serve({ fetch: (await createApp()).fetch, hostname, port })

console.info(`Devaid server listening on http://${hostname}:${port}`)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => server.close(() => process.exit(0)))
}
