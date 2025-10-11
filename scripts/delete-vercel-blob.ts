import 'dotenv/config'
import { list, del } from '@vercel/blob'

async function deleteAllBlobs() {
  const token = process.env.BLOB_READ_WRITE_TOKEN

  if (!token) {
    console.error('❌ BLOB_READ_WRITE_TOKEN not found in environment')
    process.exit(1)
  }

  console.log('🗑️  Deleting all blobs from Vercel Blob storage...\n')

  try {
    // List all blobs
    console.log('📋 Listing all blobs...')
    const { blobs } = await list({ token })

    console.log(`Found ${blobs.length} blobs to delete\n`)

    if (blobs.length === 0) {
      console.log('✅ No blobs found! Storage is already empty.')
      process.exit(0)
    }

    console.log('🗑️  Deleting blobs...')
    let deleted = 0
    let failed = 0

    // Delete in batches to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < blobs.length; i += batchSize) {
      const batch = blobs.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (blob) => {
          try {
            await del(blob.url, { token })
            console.log(`   ✅ Deleted: ${blob.pathname}`)
            deleted++
          } catch (error) {
            console.error(`   ❌ Failed to delete ${blob.pathname}: ${error}`)
            failed++
          }
        }),
      )

      // Progress update
      console.log(`   Progress: ${deleted + failed}/${blobs.length}`)

      // Small delay between batches
      if (i + batchSize < blobs.length) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('✅ Deletion completed!')
    console.log(`🗑️  Deleted: ${deleted}`)
    console.log(`❌ Failed: ${failed}`)
    console.log('='.repeat(50))

    // Verify deletion
    const { blobs: remainingBlobs } = await list({ token })
    console.log(`\n📊 Remaining blobs: ${remainingBlobs.length}`)

    if (remainingBlobs.length === 0) {
      console.log('✅ Vercel Blob storage is now completely empty!')
      console.log('💡 You can now safely delete the Blob store from Vercel dashboard.')
    }
  } catch (error) {
    console.error('❌ Deletion failed:', error)
    process.exit(1)
  }

  process.exit(0)
}

deleteAllBlobs()
