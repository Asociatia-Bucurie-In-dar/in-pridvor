#!/usr/bin/env tsx

/**
 * Delete All R2 Images Script
 * 
 * Deletes all objects from your Cloudflare R2 bucket.
 * WARNING: This action is irreversible!
 */

import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { createRequire } from 'module'
import * as readline from 'readline'

const require = createRequire(import.meta.url)

require('dotenv').config()

function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function deleteAllR2Images() {
  console.log('🗑️  Delete All R2 Images')
  console.log('─'.repeat(50))

  const required = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT', 'R2_BUCKET_NAME']

  for (const envVar of required) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing environment variable: ${envVar}`)
      return
    }
  }

  console.log(`📦 Bucket: ${process.env.R2_BUCKET_NAME}`)
  console.log(`🌐 Endpoint: ${process.env.R2_ENDPOINT}`)
  console.log('')

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  try {
    console.log('📋 Listing all objects in bucket...')
    let allObjects: Array<{ Key: string }> = []
    let continuationToken: string | undefined = undefined
    let totalCount = 0

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME!,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })

      const result = await s3Client.send(listCommand)

      if (result.Contents && result.Contents.length > 0) {
        const objects = result.Contents.map((obj) => ({ Key: obj.Key! }))
        allObjects.push(...objects)
        totalCount += result.Contents.length
        console.log(`   Found ${totalCount} objects so far...`)
      }

      continuationToken = result.NextContinuationToken
    } while (continuationToken)

    if (allObjects.length === 0) {
      console.log('✅ Bucket is already empty!')
      return
    }

    console.log('')
    console.log(`⚠️  WARNING: You are about to delete ${allObjects.length} object(s) from your R2 bucket!`)
    console.log('   This action is IRREVERSIBLE!')
    console.log('')

    const confirm1 = await askQuestion('Type "DELETE ALL" to confirm: ')
    if (confirm1 !== 'DELETE ALL') {
      console.log('❌ Deletion cancelled.')
      return
    }

    const confirm2 = await askQuestion(`Type the bucket name "${process.env.R2_BUCKET_NAME}" to confirm again: `)
    if (confirm2 !== process.env.R2_BUCKET_NAME) {
      console.log('❌ Bucket name mismatch. Deletion cancelled.')
      return
    }

    console.log('')
    console.log('🗑️  Starting deletion...')
    console.log('─'.repeat(50))

    let deletedCount = 0
    let errorCount = 0
    const batchSize = 1000

    for (let i = 0; i < allObjects.length; i += batchSize) {
      const batch = allObjects.slice(i, i + batchSize)
      const batchNumber = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(allObjects.length / batchSize)

      try {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Delete: {
            Objects: batch,
            Quiet: false,
          },
        })

        const result = await s3Client.send(deleteCommand)

        if (result.Deleted) {
          deletedCount += result.Deleted.length
        }

        if (result.Errors && result.Errors.length > 0) {
          errorCount += result.Errors.length
          console.log(`   ⚠️  Batch ${batchNumber}/${totalBatches}: ${result.Errors.length} error(s)`)
          result.Errors.forEach((error) => {
            console.log(`      - ${error.Key}: ${error.Message}`)
          })
        } else {
          console.log(`   ✅ Batch ${batchNumber}/${totalBatches}: Deleted ${result.Deleted?.length || 0} objects`)
        }
      } catch (error: any) {
        console.error(`   ❌ Batch ${batchNumber}/${totalBatches} failed: ${error.message}`)
        errorCount += batch.length
      }
    }

    console.log('─'.repeat(50))
    console.log('📊 Deletion Summary:')
    console.log(`   ✅ Successfully deleted: ${deletedCount} objects`)
    if (errorCount > 0) {
      console.log(`   ❌ Failed to delete: ${errorCount} objects`)
    }
    console.log('')

    if (deletedCount === allObjects.length) {
      console.log('🎉 All objects deleted successfully!')
    } else if (deletedCount > 0) {
      console.log(`⚠️  Deletion completed with ${errorCount} error(s)`)
    } else {
      console.log('❌ No objects were deleted. Please check the errors above.')
    }
  } catch (error: any) {
    console.error('❌ Failed to delete objects:', error.message)

    if (error.message.includes('Access Denied')) {
      console.log('\n💡 Troubleshooting:')
      console.log('- Check if your R2 API token has delete permissions')
      console.log('- Verify the bucket name is correct')
    } else if (error.message.includes('NoSuchBucket')) {
      console.log('\n💡 Troubleshooting:')
      console.log('- Check if the bucket name is correct')
      console.log('- Verify the bucket exists in your R2 dashboard')
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  deleteAllR2Images().catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
}
