#!/usr/bin/env tsx

/**
 * List R2 Buckets Script
 * 
 * Lists all R2 buckets in your account to help identify the correct bucket name
 */

import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load environment variables
require('dotenv').config()

async function listR2Buckets() {
  console.log('📋 Listing R2 Buckets...')
  console.log('─'.repeat(50))

  // Check environment variables
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_ENDPOINT) {
    console.error('❌ Missing R2 credentials in environment variables')
    return
  }

  console.log('✅ Environment variables present')
  console.log(`🌐 Endpoint: ${process.env.R2_ENDPOINT}`)
  console.log(`🔑 Access Key: ${process.env.R2_ACCESS_KEY_ID?.substring(0, 10)}...`)

  // Initialize S3 client
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  try {
    // List all buckets
    console.log('\n📦 Fetching bucket list...')
    const listCommand = new ListBucketsCommand({})
    
    const result = await s3Client.send(listCommand)
    
    if (result.Buckets && result.Buckets.length > 0) {
      console.log(`✅ Found ${result.Buckets.length} bucket(s):`)
      console.log('')
      
      result.Buckets.forEach((bucket, index) => {
        console.log(`${index + 1}. ${bucket.Name}`)
        if (bucket.CreationDate) {
          console.log(`   Created: ${bucket.CreationDate.toISOString().split('T')[0]}`)
        }
        console.log('')
      })
      
      console.log('💡 Copy the correct bucket name and update your .env file:')
      console.log('   R2_BUCKET_NAME="correct-bucket-name"')
      
    } else {
      console.log('❌ No buckets found in your R2 account')
      console.log('💡 You may need to create a bucket first in the Cloudflare dashboard')
    }

  } catch (error: any) {
    console.error('❌ Failed to list buckets:', error.message)
    
    if (error.message.includes('Access Denied')) {
      console.log('\n💡 Troubleshooting:')
      console.log('- Check if your R2 API token has the right permissions')
      console.log('- Make sure you created R2 S3-compatible credentials, not general API token')
    } else if (error.message.includes('InvalidAccessKeyId')) {
      console.log('\n💡 Troubleshooting:')
      console.log('- Check if your Access Key ID is correct')
      console.log('- Make sure you copied the R2 S3 credentials')
    } else if (error.message.includes('SignatureDoesNotMatch')) {
      console.log('\n💡 Troubleshooting:')
      console.log('- Check if your Secret Access Key is correct')
      console.log('- Make sure there are no extra spaces in your .env file')
    }
  }
}

// Run script
if (import.meta.url === `file://${process.argv[1]}`) {
  listR2Buckets().catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
}
