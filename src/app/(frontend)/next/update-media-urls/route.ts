import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

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

    // Get all media entries
    const allMedia = await payload.find({
      collection: 'media',
      limit: 0, // Get all media
      depth: 0,
      req: payloadReq,
    })

    payload.logger.info(`📋 Found ${allMedia.totalDocs} media entries.`)

    let updated = 0
    let errors = 0
    const errorsList: string[] = []

    // Your R2 bucket base URL
    const r2BaseUrl = 'https://pub-783d443dc99c4437a1dec57bce145273.r2.dev'

    for (const media of allMedia.docs) {
      try {
        // Check if this media has a WordPress URL
        if (media.url && media.url.includes('inpridvor.ro/wp-content/uploads/')) {
          // Extract the filename from the current URL
          const filename = media.filename

          // Create the new R2 URL
          const newR2Url = `${r2BaseUrl}/${filename}`

          // Update the media entry with the R2 URL
          await payload.update({
            collection: 'media',
            id: media.id,
            data: {
              url: newR2Url,
            },
            req: payloadReq,
          })

          updated++
          payload.logger.info(`✅ Updated media "${filename}": ${media.url} -> ${newR2Url}`)

          // Small delay to avoid overwhelming the server
          if (updated % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        } else {
          payload.logger.info(`⏭️ Media "${media.filename}" already has R2 URL or no URL`)
        }
      } catch (error: any) {
        errors++
        const errorMessage = `Failed to update media "${media.filename}": ${error.message || error}`
        errorsList.push(errorMessage)
        payload.logger.error(errorMessage)
      }
    }

    payload.logger.info(`Media URL update completed: ${updated} updated, ${errors} errors`)

    return Response.json({
      success: true,
      updated,
      errors,
      total: allMedia.totalDocs,
      errorList: errorsList.slice(0, 10), // Return first 10 errors
    })
  } catch (e: any) {
    payload.logger.error({ err: e, message: 'Error updating media URLs' })
    return new Response('Error updating media URLs.', { status: 500 })
  }
}
