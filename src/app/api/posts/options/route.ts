import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise })

    const { user } = await payload.auth({ headers: request.headers })

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const [users, categories] = await Promise.all([
      payload.find({
        collection: 'users',
        limit: 1000,
        select: {
          id: true,
          name: true,
        },
      }),
      payload.find({
        collection: 'categories',
        limit: 1000,
        select: {
          id: true,
          title: true,
          slug: true,
        },
      }),
    ])

    return NextResponse.json({
      users: users.docs.map((u) => ({ id: u.id, name: u.name })),
      categories: categories.docs.map((c) => ({ id: c.id, title: c.title, slug: c.slug })),
    })
  } catch (error) {
    console.error('Error fetching options:', error)
    return NextResponse.json(
      { message: 'Error fetching options', error: String(error) },
      { status: 500 },
    )
  }
}

