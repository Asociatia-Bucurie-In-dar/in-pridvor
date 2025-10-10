import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, comment, post } = body

    // Validate required fields
    if (!name || !email || !comment || !post) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Validate field lengths
    if (name.length > 100) {
      return NextResponse.json(
        { message: 'Name is too long' },
        { status: 400 }
      )
    }

    if (comment.length > 1000) {
      return NextResponse.json(
        { message: 'Comment is too long' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config: configPromise })

    // Create the comment
    const newComment = await payload.create({
      collection: 'comments',
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        comment: comment.trim(),
        post: post,
        status: 'pending', // All comments start as pending for moderation
      },
    })

    return NextResponse.json(
      {
        message: 'Comment submitted successfully',
        id: newComment.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { message: 'Failed to submit comment. Please try again.' },
      { status: 500 }
    )
  }
}

