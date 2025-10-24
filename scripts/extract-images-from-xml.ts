// Extract image data from WordPress XML file
import fs from 'fs'
import path from 'path'
import { XMLParser } from 'fast-xml-parser'

interface PostImage {
  postId: string
  postTitle: string
  featuredImageUrl: string
  imageFileName: string
}

async function extractImagesFromXML() {
  console.log('🖼️ Extracting images from WordPress XML...')

  const xmlFilePath = path.join(process.cwd(), 'inpridvor.WordPress.2025-10-24.xml')

  if (!fs.existsSync(xmlFilePath)) {
    console.error('❌ XML file not found:', xmlFilePath)
    return
  }

  const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8')
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    parseTagValue: true,
  })

  const xmlData = parser.parse(xmlContent)
  const posts = xmlData.rss.channel.item || []

  console.log(`📊 Found ${posts.length} items in XML`)

  const postImages: PostImage[] = []
  const attachmentUrls: string[] = []

  // First pass: collect all attachment URLs
  posts.forEach((post: any) => {
    if (post['wp:post_type'] === 'attachment' && post['wp:attachment_url']) {
      attachmentUrls.push(post['wp:attachment_url'])
    }
  })

  console.log(`📎 Found ${attachmentUrls.length} attachment URLs`)

  // Second pass: find posts with featured images
  posts.forEach((post: any) => {
    if (post['wp:post_type'] === 'post' && post['wp:status'] === 'publish') {
      const postId = post['wp:post_id']
      const postTitle = post.title || 'Untitled'

      // Look for featured image in postmeta
      if (post['wp:postmeta']) {
        const postmeta = Array.isArray(post['wp:postmeta'])
          ? post['wp:postmeta']
          : [post['wp:postmeta']]

        for (const meta of postmeta) {
          if (meta['wp:meta_key'] === '_thumbnail_id' && meta['wp:meta_value']) {
            const thumbnailId = meta['wp:meta_value']

            // Find the attachment with this ID
            const attachment = posts.find(
              (p: any) =>
                p['wp:post_id'] === thumbnailId &&
                p['wp:post_type'] === 'attachment' &&
                p['wp:attachment_url'],
            )

            if (attachment) {
              const imageUrl = attachment['wp:attachment_url']
              const imageFileName = path.basename(imageUrl)

              // Get image metadata to determine quality
              let imageWidth = 0
              let imageHeight = 0
              let fileSize = 0

              // Look for image metadata in the attachment's postmeta
              if (attachment['wp:postmeta']) {
                const attachmentMeta = Array.isArray(attachment['wp:postmeta'])
                  ? attachment['wp:postmeta']
                  : [attachment['wp:postmeta']]

                for (const attMeta of attachmentMeta) {
                  if (
                    attMeta['wp:meta_key'] === '_wp_attachment_metadata' &&
                    attMeta['wp:meta_value']
                  ) {
                    try {
                      // WordPress stores metadata as serialized PHP data
                      const metadata = attMeta['wp:meta_value']
                      // Extract dimensions from the metadata string
                      const widthMatch = metadata.match(/s:5:"width";i:(\d+)/)
                      const heightMatch = metadata.match(/s:6:"height";i:(\d+)/)
                      const fileSizeMatch = metadata.match(/s:8:"filesize";i:(\d+)/)

                      if (widthMatch) imageWidth = parseInt(widthMatch[1])
                      if (heightMatch) imageHeight = parseInt(heightMatch[1])
                      if (fileSizeMatch) fileSize = parseInt(fileSizeMatch[1])
                    } catch (e) {
                      // Ignore parsing errors
                    }
                    break
                  }
                }
              }

              // Check if we already have an image for this post
              const existingImageIndex = postImages.findIndex((img) => img.postId === postId)

              if (existingImageIndex === -1) {
                // No existing image, add this one
                postImages.push({
                  postId,
                  postTitle,
                  featuredImageUrl: imageUrl,
                  imageFileName,
                })

                console.log(
                  `✅ Found featured image for "${postTitle}": ${imageFileName} (${imageWidth}x${imageHeight}, ${fileSize} bytes)`,
                )
              } else {
                // We already have an image, compare quality
                const existingImage = postImages[existingImageIndex]
                const existingPixels = imageWidth * imageHeight
                const currentPixels = imageWidth * imageHeight

                // Keep the image with more pixels (higher resolution)
                if (currentPixels > existingPixels) {
                  postImages[existingImageIndex] = {
                    postId,
                    postTitle,
                    featuredImageUrl: imageUrl,
                    imageFileName,
                  }
                  console.log(
                    `🔄 Replaced with higher quality image for "${postTitle}": ${imageFileName} (${imageWidth}x${imageHeight})`,
                  )
                } else {
                  console.log(
                    `⏭️ Keeping existing higher quality image for "${postTitle}": ${existingImage.imageFileName}`,
                  )
                }
              }
              break
            }
          }
        }
      }
    }
  })

  console.log(`\n📊 Summary:`)
  console.log(
    `- Total posts: ${posts.filter((p: any) => p['wp:post_type'] === 'post' && p['wp:status'] === 'publish').length}`,
  )
  console.log(`- Posts with featured images: ${postImages.length}`)
  console.log(`- Total attachments: ${attachmentUrls.length}`)

  // Save the results
  const outputPath = path.join(process.cwd(), 'import-data', 'post-images.json')
  fs.writeFileSync(outputPath, JSON.stringify(postImages, null, 2))

  const attachmentOutputPath = path.join(process.cwd(), 'import-data', 'attachment-urls.json')
  fs.writeFileSync(attachmentOutputPath, JSON.stringify(attachmentUrls, null, 2))

  console.log(`\n💾 Saved post images to: ${outputPath}`)
  console.log(`💾 Saved attachment URLs to: ${attachmentOutputPath}`)

  // Show some examples
  console.log(`\n📋 Sample post images:`)
  postImages.slice(0, 5).forEach((img, index) => {
    console.log(`${index + 1}. "${img.postTitle}" -> ${img.imageFileName}`)
  })

  return postImages
}

extractImagesFromXML().catch(console.error)
