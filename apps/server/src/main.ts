import { serve } from '@hono/node-server'

import { createApp } from './app.ts'

const hostname = '127.0.0.1'
const port = Number(process.env.OH_MY_HARNESS_SERVER_PORT ?? 4318)
const app = await createApp()
const server = serve({ fetch: app.fetch, hostname, port })

console.info(`oh-my-harness server listening on http://${hostname}:${port}`)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    server.close()
    void app.close().catch(() => {
      process.exitCode = 1
    })
  })
}
