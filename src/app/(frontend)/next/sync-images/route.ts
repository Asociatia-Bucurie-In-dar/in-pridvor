import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import fs from 'fs'
import path from 'path'

interface PostImage {
  postId: string
  postTitle: string
  featuredImageUrl: string
  imageFileName: string
}

export const maxDuration = 300 // This function can run for a maximum of 5 minutes

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  // Authenticate by passing request headers
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return new Response('Action forbidden.', { status: 403 })
  }

  try {
    // Create a Payload request object to pass to the Local API for transactions
    const payloadReq = await createLocalReq({ user }, payload)

    // Read the post images data
    const imagesFilePath = path.join(process.cwd(), 'import-data', 'post-images.json')

    if (!fs.existsSync(imagesFilePath)) {
      return new Response('Post images file not found.', { status: 404 })
    }

    const postImages: PostImage[] = JSON.parse(fs.readFileSync(imagesFilePath, 'utf-8'))

    payload.logger.info(`📊 Found ${postImages.length} posts with images.`)

    // Get all posts from the database
    const allPosts = await payload.find({
      collection: 'posts',
      limit: 0, // Get all posts
      depth: 0,
      req: payloadReq,
    })

    // Get all existing media from R2 bucket
    const allMedia = await payload.find({
      collection: 'media',
      limit: 0, // Get all media
      depth: 0,
      req: payloadReq,
    })

    payload.logger.info(
      `📋 Found ${allPosts.totalDocs} posts and ${allMedia.totalDocs} existing R2 media items.`,
    )

    let processed = 0
    let linkedExisting = 0
    let uploaded = 0
    let imagesNotFound = 0
    let errors = 0
    const errorsList: string[] = []
    const notFoundList: string[] = []

    // Process each post image
    for (const postImage of postImages) {
      try {
        // Find the corresponding post in the database by title
        const matchingPost = allPosts.docs.find((post) => post.title === postImage.postTitle)

        if (!matchingPost) {
          payload.logger.warn(`⚠️ Post not found: "${postImage.postTitle}"`)
          continue
        }

        // Check if the post already has an image
        if (matchingPost.heroImage) {
          payload.logger.info(`⏭️ Post "${postImage.postTitle}" already has an image, skipping.`)
          continue
        }

        // Step 1: Try to find existing media in R2 by filename (without extension)
        // The XML has .jpg/.jpeg files, but R2 has .webp files with the same basename
        const baseFileName = path.parse(postImage.imageFileName).name.toLowerCase()
        const matchingMedia = allMedia.docs.find((media) => {
          if (!media.filename) return false
          const mediaBaseName = path.parse(media.filename).name.toLowerCase()
          return mediaBaseName === baseFileName
        })

        if (matchingMedia) {
          // Found existing media in R2, link it to the post
          const updatedPost = await payload.update({
            collection: 'posts',
            id: matchingPost.id,
            data: {
              heroImage: matchingMedia.id,
            },
            depth: 0,
            req: payloadReq,
          })

          linkedExisting++
          payload.logger.info(
            `✅ Linked existing R2 image to "${postImage.postTitle}": ${matchingMedia.filename} (Post ID: ${updatedPost.id}, Image ID: ${updatedPost.heroImage})`,
          )
        } else {
          // Step 2: Image not found in R2, download and upload it
          payload.logger.info(
            `📥 Downloading image for "${postImage.postTitle}" from ${postImage.featuredImageUrl}`,
          )

          try {
            // Download the image from WordPress URL
            const imageResponse = await fetch(postImage.featuredImageUrl)

            if (!imageResponse.ok) {
              throw new Error(`Failed to download image: ${imageResponse.statusText}`)
            }

            const imageBuffer = await imageResponse.arrayBuffer()
            const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

            // Create a proper file upload object with required Payload properties
            const fileUpload = {
              data: Buffer.from(imageBuffer),
              mimetype: mimeType,
              name: postImage.imageFileName,
              size: imageBuffer.byteLength,
            }

            // Upload to Payload (which will handle R2 upload and optimization)
            const uploadedMedia = await payload.create({
              collection: 'media',
              data: {
                alt: postImage.postTitle,
              },
              file: fileUpload,
              req: payloadReq,
            })

            // Link the newly uploaded media to the post
            await payload.update({
              collection: 'posts',
              id: matchingPost.id,
              data: {
                heroImage: uploadedMedia.id,
              },
              req: payloadReq,
            })

            uploaded++
            payload.logger.info(
              `✅ Uploaded and linked new image to "${postImage.postTitle}": ${postImage.imageFileName}`,
            )

            // Add the new media to our list for future matches
            allMedia.docs.push(uploadedMedia)
          } catch (uploadError: any) {
            imagesNotFound++
            notFoundList.push(
              `"${postImage.postTitle}" -> ${postImage.imageFileName}: ${uploadError.message}`,
            )
            payload.logger.error(
              `❌ Failed to upload image for "${postImage.postTitle}": ${uploadError.message}`,
            )
          }
        }

        processed++

        // Small delay to avoid overwhelming the server
        if (processed % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      } catch (error: any) {
        errors++
        const errorMessage = `Failed to process image for "${postImage.postTitle}": ${error.message || error}`
        errorsList.push(errorMessage)
        payload.logger.error(errorMessage)
      }
    }

    payload.logger.info(
      `Image sync completed: ${linkedExisting} linked from R2, ${uploaded} uploaded, ${imagesNotFound} not found, ${errors} errors`,
    )

    return Response.json({
      success: true,
      processed,
      linkedExisting,
      uploaded,
      imagesNotFound,
      errors,
      total: postImages.length,
      errorList: errorsList.slice(0, 10), // Return first 10 errors
      notFoundList: notFoundList.slice(0, 20), // Return first 20 not found
    })
  } catch (e: any) {
    payload.logger.error({ err: e, message: 'Error syncing images' })
    return new Response('Error syncing images.', { status: 500 })
  }
}
