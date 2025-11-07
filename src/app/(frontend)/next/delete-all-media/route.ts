import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

export const maxDuration = 300

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return new Response('Action forbidden.', { status: 403 })
  }

  try {
    const payloadReq = await createLocalReq({ user }, payload)

    const allMedia = await payload.find({
      collection: 'media',
      limit: 0,
      depth: 0,
      req: payloadReq,
    })

    payload.logger.info(`🗑️ Found ${allMedia.totalDocs} media items to delete`)

    let deleted = 0
    let errors = 0
    const errorsList: string[] = []

    for (const media of allMedia.docs) {
      try {
        await payload.delete({
          collection: 'media',
          id: media.id,
          req: payloadReq,
        })
        deleted++
        if (deleted % 10 === 0) {
          payload.logger.info(`Deleted ${deleted} media items...`)
        }
      } catch (error: any) {
        errors++
        const errorMessage = `Failed to delete media "${media.filename || media.id}": ${error.message || error}`
        errorsList.push(errorMessage)
        payload.logger.error(errorMessage)
      }
    }

    payload.logger.info(
      `✅ Media deletion completed: ${deleted} deleted, ${errors} errors`,
    )

    return Response.json({
      success: true,
      deleted,
      errors,
      total: allMedia.totalDocs,
      errorList: errorsList.slice(0, 10),
    })
  } catch (e: any) {
    payload.logger.error({ err: e, message: 'Error deleting all media' })
    return new Response(`Error deleting all media: ${e.message}`, { status: 500 })
  }
}

