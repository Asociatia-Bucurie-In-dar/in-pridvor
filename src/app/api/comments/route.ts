import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received comment submission:', { body })
    const { name, email, comment, post, parent } = body

    // Validate required fields
    if (!name || !email || !comment || !post) {
      console.log('Missing required fields')
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Invalid email address' }, { status: 400 })
    }

    // Validate field lengths
    if (name.length > 100) {
      return NextResponse.json({ message: 'Name is too long' }, { status: 400 })
    }

    if (comment.length > 3000) {
      return NextResponse.json({ message: 'Comment is too long' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })
    console.log('Got payload instance, attempting to create comment...')

    // Parse post ID as number for Payload relationship field
    const postId = typeof post === 'string' ? parseInt(post, 10) : post
    console.log('Post ID (parsed):', postId, 'Type:', typeof postId)

    // Parse parent ID if provided
    const parentId = parent
      ? typeof parent === 'string'
        ? parseInt(parent, 10)
        : parent
      : undefined

    // Create the comment data
    const commentData: any = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      comment: comment.trim(),
      post: postId,
      status: 'approved', // Comments are approved by default
    }

    // Add parent if this is a reply
    if (parentId) {
      commentData.parent = parentId
    }

    // Create the comment
    const newComment = await payload.create({
      collection: 'comments',
      data: commentData,
    })

    console.log('Comment created successfully:', newComment.id)

    revalidateTag('comments')

    return NextResponse.json(
      {
        message: 'Comment submitted successfully',
        id: newComment.id,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { message: 'Failed to submit comment. Please try again.' },
      { status: 500 },
    )
  }
}
