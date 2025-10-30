#!/usr/bin/env tsx

import { config as loadEnv } from 'dotenv'
import { Pool } from 'pg'

async function main() {
  loadEnv()

  const connectionString = process.env.POSTGRES_URL
  if (!connectionString) {
    console.error('POSTGRES_URL missing in .env')
    process.exit(1)
  }

  const pool = new Pool({ connectionString })
  try {
    console.log('🔧 Ensuring categories.display_order column exists...')

    // Create column if missing
    await pool.query(
      'ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order numeric DEFAULT 0',
    )

    // Optional: ensure not null? Keeping nullable so admin can clear if desired
    console.log('✅ Column check complete.')
  } catch (e) {
    console.error('❌ Failed to add column:', e)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main().then(() => process.exit(0))


