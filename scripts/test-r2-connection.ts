#!/usr/bin/env tsx

/**
 * Test R2 Connection Script
 *
 * Tests if the R2 credentials and bucket are working correctly
 */

import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load environment variables
require('dotenv').config()

async function testR2Connection() {
  console.log('🧪 Testing R2 Connection...')
  console.log('─'.repeat(50))

  // Check environment variables
  const required = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT', 'R2_BUCKET_NAME']

  for (const envVar of required) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing environment variable: ${envVar}`)
      return
    }
  }

  console.log('✅ Environment variables present')
  console.log(`📦 Bucket: ${process.env.R2_BUCKET_NAME}`)
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
    // Test 1: List objects in bucket
    console.log('\n📋 Test 1: Listing objects in bucket...')
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      MaxKeys: 5,
    })

    const listResult = await s3Client.send(listCommand)
    console.log(`✅ Successfully connected to bucket`)
    console.log(`📁 Found ${listResult.Contents?.length || 0} objects`)

    if (listResult.Contents && listResult.Contents.length > 0) {
      console.log('📄 Sample objects:')
      listResult.Contents.slice(0, 3).forEach((obj) => {
        console.log(`   - ${obj.Key} (${obj.Size} bytes)`)
      })
    }

    // Test 2: Upload a small test file
    console.log('\n📤 Test 2: Uploading test file...')
    const testContent = 'Hello from R2 migration test!'
    const testKey = `test-${Date.now()}.txt`

    const putCommand = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    })

    await s3Client.send(putCommand)
    console.log(`✅ Successfully uploaded test file: ${testKey}`)

    // Test 3: Verify the file exists
    console.log('\n🔍 Test 3: Verifying uploaded file...')
    const verifyListCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: testKey,
    })

    const verifyResult = await s3Client.send(verifyListCommand)
    if (verifyResult.Contents && verifyResult.Contents.length > 0) {
      console.log(`✅ Test file verified: ${verifyResult.Contents[0].Key}`)
    } else {
      console.log('❌ Test file not found')
    }

    console.log('\n🎉 R2 connection test successful!')
    console.log('\nNext steps:')
    console.log('1. Get your R2 public URL from bucket settings')
    console.log('2. Update R2_PUBLIC_URL in .env file')
    console.log('3. Run the migration script again')
  } catch (error: any) {
    console.error('❌ R2 connection test failed:', error.message)

    if (error.message.includes('Access Denied')) {
      console.log('\n💡 Troubleshooting:')
      console.log('- Check if your R2 API token has the right permissions')
      console.log('- Verify the bucket name is correct')
      console.log('- Make sure the token is for R2, not general Cloudflare API')
    } else if (error.message.includes('NoSuchBucket')) {
      console.log('\n💡 Troubleshooting:')
      console.log('- Check if the bucket name is correct')
      console.log('- Verify the bucket exists in your R2 dashboard')
    } else if (error.message.includes('InvalidAccessKeyId')) {
      console.log('\n💡 Troubleshooting:')
      console.log('- Check if your Access Key ID is correct')
      console.log('- Make sure you copied the R2 S3 credentials, not the general API token')
    }
  }
}

// Run test
if (import.meta.url === `file://${process.argv[1]}`) {
  testR2Connection().catch((error) => {
    console.error('❌ Test failed:', error)
    process.exit(1)
  })
}
