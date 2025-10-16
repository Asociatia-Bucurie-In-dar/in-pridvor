import { getPayload } from 'payload'
import config from '../src/payload.config'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load environment variables
require('dotenv').config()

async function checkDatabaseAudit() {
  const payload = await getPayload({ config })

  console.log('🔍 Checking database for audit trail or versioning...\n')

  try {
    // Check if there are any version tables (Payload CMS has versioning)
    const collections = ['posts', 'categories']

    for (const collection of collections) {
      console.log(`📊 Checking ${collection} collection:`)

      // Check main collection
      const mainDocs = await payload.find({
        collection: collection as any,
        limit: 5,
        depth: 0,
      })

      console.log(`  Main ${collection}: ${mainDocs.docs.length} docs`)

      // Check if there's a versions table
      try {
        const versions = await payload.find({
          collection: `${collection}_versions` as any,
          limit: 10,
          depth: 0,
        })
        console.log(`  Versions: ${versions.docs.length} version records`)

        if (versions.docs.length > 0) {
          console.log('    Recent versions:')
          versions.docs.slice(0, 3).forEach((version: any) => {
            console.log(
              `      - ID: ${version.parent} (${version.version}) - Updated: ${version.updatedAt}`,
            )
            if (collection === 'posts' && version.categories) {
              console.log(`        Categories: ${JSON.stringify(version.categories)}`)
            }
          })
        }
      } catch (error) {
        console.log(`  No versions table found for ${collection}`)
      }
    }

    // Check database tables directly
    console.log('\n🗄️  Checking database tables directly:')

    const db = payload.db
    if (db && typeof db.query === 'function') {
      try {
        // Check for any tables that might contain category relationships
        const tables = await db.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name LIKE '%categories%' 
          OR table_name LIKE '%posts%'
          OR table_name LIKE '%rels%'
        `)

        console.log('  Found tables:', tables)
      } catch (error) {
        console.log('  Could not query database schema directly')
      }
    }
  } catch (error) {
    console.error('❌ Error checking database:', error)
  }
}

// Run the check
checkDatabaseAudit()
  .then(() => {
    console.log('\n✅ Database audit check complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Database audit check failed:', error)
    process.exit(1)
  })
