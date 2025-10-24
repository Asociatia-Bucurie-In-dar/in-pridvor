// Run this in your browser console while logged into the admin panel
// This will clean up the corrupted posts

async function cleanupCorruptedPosts() {
  console.log('🧹 Starting cleanup of corrupted posts...')

  try {
    const response = await fetch('/next/cleanup-posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ Cleanup successful!')
      console.log('Results:', result)

      if (result.deletedCount > 0) {
        console.log(`🗑️ Deleted ${result.deletedCount} corrupted posts`)
        console.log(`📊 ${result.remainingCount} posts remaining`)

        // Refresh the page to see the changes
        console.log('🔄 Refreshing page...')
        window.location.reload()
      } else {
        console.log('ℹ️ No corrupted posts found')
      }
    } else {
      console.error('❌ Cleanup failed:', result)
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}

// Run the cleanup
cleanupCorruptedPosts()
