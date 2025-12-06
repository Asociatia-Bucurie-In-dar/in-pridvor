import { createLocalReq, getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await getPayload({ config: configPromise })

    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { authors, categories, enableDropCap, dropCapParagraphIndex, heroImageAlignment } = body

    const updateData: any = {}

    if (authors !== undefined) {
      updateData.authors = authors
    }

    if (categories !== undefined) {
      updateData.categories = categories
    }

    if (enableDropCap !== undefined) {
      updateData.enableDropCap = enableDropCap
    }

    if (dropCapParagraphIndex !== undefined) {
      updateData.dropCapParagraphIndex = dropCapParagraphIndex
    }

    if (heroImageAlignment !== undefined) {
      updateData.heroImageAlignment = heroImageAlignment
    }

    console.log('Updating post with data:', { id, updateData })

    const payloadReq = await createLocalReq({ user }, payload)

    const updatedPost = await payload.update({
      collection: 'posts',
      id: parseInt(id, 10),
      data: updateData,
      overrideAccess: true,
      req: payloadReq,
    })

    return NextResponse.json({ success: true, post: updatedPost })
  } catch (error) {
    console.error('Error updating post:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    return NextResponse.json(
      {
        message: 'Error updating post',
        error: errorMessage,
        stack: errorStack,
      },
      { status: 500 },
    )
  }
}
