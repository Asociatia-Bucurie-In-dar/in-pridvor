#!/usr/bin/env tsx

import { config as loadEnv } from 'dotenv'
import { getPayload } from 'payload'

async function main() {
  loadEnv()
  const { default: payloadConfig } = await import('../src/payload.config')
  const payload = await getPayload({ config: payloadConfig })

  const res = await payload.find({
    collection: 'categories',
    limit: 1000,
    depth: 0,
    pagination: false,
  })

  const rows = res.docs.map((c: any) => ({ id: c.id, title: c.title, parent: c.parent, displayOrder: c.displayOrder }))
  console.table(rows)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })


