#!/usr/bin/env tsx

/**
 * Test R2 Endpoints Script
 * 
 * Tests different R2 endpoint formats to find the correct one
 */

import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load environment variables
require('dotenv').config()

async function testEndpoints() {
  console.log('🧪 Testing Different R2 Endpoints...')
  console.log('─'.repeat(50))

  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    console.error('❌ Missing R2 credentials')
    return
  }

  // Extract account ID from current endpoint
  const currentEndpoint = process.env.R2_ENDPOINT || ''
  const accountIdMatch = currentEndpoint.match(/([a-f0-9]+)\./)
  const accountId = accountIdMatch ? accountIdMatch[1] : 'e693c54742db0edb3b63b21502f095d0'

  console.log(`🔍 Account ID: ${accountId}`)

  // Test different endpoint formats
  const endpoints = [
    `https://${accountId}.r2.cloudflarestorage.com`,
    `https://${accountId}.eu.r2.cloudflarestorage.com`,
    `https://${accountId}.us.r2.cloudflarestorage.com`,
    `https://${accountId}.fedramp.r2.cloudflarestorage.com`,
  ]

  for (const endpoint of endpoints) {
    console.log(`\n🌐 Testing endpoint: ${endpoint}`)
    
    const s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })

    try {
      const listCommand = new ListBucketsCommand({})
      const result = await s3Client.send(listCommand)
      
      if (result.Buckets && result.Buckets.length > 0) {
        console.log(`✅ SUCCESS! Found ${result.Buckets.length} bucket(s):`)
        result.Buckets.forEach(bucket => {
          console.log(`   - ${bucket.Name}`)
        })
        
        console.log(`\n💡 Update your .env file with:`)
        console.log(`   R2_ENDPOINT="${endpoint}"`)
        
        return // Exit on first success
      } else {
        console.log(`   No buckets found`)
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`)
    }
  }

  console.log(`\n💡 If none worked, check:`)
  console.log(`   1. Bucket exists in Cloudflare dashboard`)
  console.log(`   2. Correct account/region`)
  console.log(`   3. R2 S3-compatible credentials (not general API token)`)
}

// Run script
if (import.meta.url === `file://${process.argv[1]}`) {
  testEndpoints().catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
}
