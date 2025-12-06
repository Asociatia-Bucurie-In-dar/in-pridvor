import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await getPayload({ config: configPromise })

    const post = await payload.findByID({
      collection: 'posts',
      id: parseInt(id, 10),
      depth: 0,
    })

    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 })
    }

    const currentViewCount = typeof post.viewCount === 'number' ? post.viewCount : 0

    await payload.update({
      collection: 'posts',
      id: parseInt(id, 10),
      data: {
        viewCount: currentViewCount + 1,
      },
      overrideAccess: true,
      context: {
        disableRevalidate: true,
      },
    })

    return NextResponse.json({ success: true, viewCount: currentViewCount + 1 })
  } catch (error) {
    console.error('Error incrementing view count:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      {
        message: 'Error incrementing view count',
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}
