// Clean up physical media files from public/media directory
// This removes all downloaded images to start fresh

import fs from 'fs'
import path from 'path'

async function cleanupMediaFiles() {
  console.log('🗂️  Cleaning up physical media files...')
  console.log('=======================================\n')

  const mediaDir = path.join(process.cwd(), 'public', 'media')

  if (!fs.existsSync(mediaDir)) {
    console.log('✅ No media directory found - already clean!')
    return
  }

  try {
    console.log('📁 Checking media directory structure...')
    const items = fs.readdirSync(mediaDir)
    console.log(`Found ${items.length} items in media directory`)

    if (items.length === 0) {
      console.log('✅ Media directory is already empty!')
      return
    }

    console.log('\n🗑️  Deleting all media files...')
    let deletedCount = 0
    let totalSize = 0

    function deleteRecursive(dirPath: string) {
      const items = fs.readdirSync(dirPath)

      for (const item of items) {
        const itemPath = path.join(dirPath, item)
        const stats = fs.statSync(itemPath)

        if (stats.isDirectory()) {
          deleteRecursive(itemPath)
          fs.rmdirSync(itemPath)
        } else {
          totalSize += stats.size
          fs.unlinkSync(itemPath)
          deletedCount++

          if (deletedCount % 100 === 0) {
            console.log(`Deleted ${deletedCount} files...`)
          }
        }
      }
    }

    deleteRecursive(mediaDir)

    console.log(`\n✅ Cleanup completed!`)
    console.log(`- Deleted ${deletedCount} files`)
    console.log(`- Freed up ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`- Media directory is now empty`)
  } catch (error) {
    console.error('❌ Error cleaning up media files:', error)
    throw error
  }
}

cleanupMediaFiles().catch(console.error)
