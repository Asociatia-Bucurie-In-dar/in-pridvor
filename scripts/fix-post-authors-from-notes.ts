#!/usr/bin/env tsx

import { config as loadEnv } from 'dotenv'
import { getPayload } from 'payload'

loadEnv()

type NameVariant = {
  slug: string
  authorNames: string[]
}

type PostVariant = {
  slug: string
  authorNames: string[]
}

type UserRecord = {
  id: string | number
  name: string
}

type AssignmentTarget = {
  user: UserRecord
  source: 'category' | 'post'
  slug: string
}

function normalizeName(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizeSlug(text: string): string {
  return text.toLowerCase().trim()
}

async function run(): Promise<void> {
  const payloadConfig = (await import('../src/payload.config.ts')).default

  const categoryAssignments: NameVariant[] = [
    { slug: 'culoarea-zilei', authorNames: ['Pr. Cristian Muntean', 'Cristian Muntean'] },
    { slug: 'picaturi-de-moarte', authorNames: ['Șerban Madgearu', 'Serban Madgearu'] },
    { slug: 'gradina-cu-intelesuri', authorNames: ['Pr. Iustin Taban', 'Iustin Taban'] },
    { slug: 'draga-mama', authorNames: ['Dr. Daniela Ilioiu', 'Daniela Ilioiu'] },
    { slug: 'din-camara-inimii', authorNames: ['Andreea Macra'] },
    { slug: 'firimituri-de-bucurie', authorNames: ['Alexandrina'] },
    { slug: 'arta-acasa', authorNames: ['Ioana Todor'] },
    { slug: 'printre-umbre-si-lumini', authorNames: ['Simona Andrușcă', 'Simona Andrusca'] },
  ]

  const postAssignments: PostVariant[] = [
    { slug: 'amin', authorNames: ['Sergiu Mandinescu'] },
    {
      slug: 'mai-puternici-decat-toate-patimile',
      authorNames: [
        'Arhimandritul Zaharia',
        'Arhim. Zaharia',
        'Zaharia Zaharou',
        'Parintele Zaharia',
      ],
    },
    {
      slug: 'jurnal-de-la-sfintirea-catedralei-mantuirii-neamului',
      authorNames: ['Alina-Ana Nistor', 'Alina Ana Nistor', 'Alina Nistor'],
    },
  ]

  const payload = await getPayload({ config: payloadConfig })

  console.log('🔄 Loading users, categories, and posts')

  const users = await payload.find({
    collection: 'users',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  const categories = await payload.find({
    collection: 'categories',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  const posts = await payload.find({
    collection: 'posts',
    limit: 10000,
    depth: 0,
    overrideAccess: true,
  })

  const userMap = new Map<string, UserRecord>()
  users.docs.forEach((user: any) => {
    if (user?.name) {
      const key = normalizeName(String(user.name))
      if (key) {
        userMap.set(key, { id: user.id, name: user.name })
      }
    }
  })

  function findUser(authorNames: string[]): UserRecord | null {
    for (const name of authorNames) {
      const key = normalizeName(name)
      if (!key) continue
      if (userMap.has(key)) {
        return userMap.get(key) || null
      }
      for (const [userKey, user] of userMap) {
        if (userKey.includes(key) || key.includes(userKey)) {
          return user
        }
      }
    }
    return null
  }

  const categorySlugToIds = new Map<string, string[]>()
  categories.docs.forEach((category: any) => {
    const slugValue = category?.slug ? normalizeSlug(String(category.slug)) : ''
    const idValue = category?.id ? String(category.id) : ''
    if (!slugValue || !idValue) return
    const existing = categorySlugToIds.get(slugValue)
    if (existing) {
      existing.push(idValue)
    } else {
      categorySlugToIds.set(slugValue, [idValue])
    }
  })

  const categoryIdToAssignment = new Map<string, AssignmentTarget>()
  const postSlugToAssignment = new Map<string, AssignmentTarget>()
  const missingUsers: string[] = []
  const missingCategories: string[] = []

  categoryAssignments.forEach((assignment) => {
    const user = findUser(assignment.authorNames)
    if (!user) {
      missingUsers.push(
        `Autor lipsă pentru categoria ${assignment.slug}: ${assignment.authorNames.join(', ')}`,
      )
      return
    }
    const slugKey = normalizeSlug(assignment.slug)
    const ids = categorySlugToIds.get(slugKey)
    if (!ids || ids.length === 0) {
      missingCategories.push(`Categorie negăsită pentru slug ${assignment.slug}`)
      return
    }
    ids.forEach((id) => {
      categoryIdToAssignment.set(id, { user, source: 'category', slug: assignment.slug })
    })
  })

  postAssignments.forEach((assignment) => {
    const user = findUser(assignment.authorNames)
    if (!user) {
      missingUsers.push(
        `Autor lipsă pentru articol ${assignment.slug}: ${assignment.authorNames.join(', ')}`,
      )
      return
    }
    const slugKey = normalizeSlug(assignment.slug)
    postSlugToAssignment.set(slugKey, { user, source: 'post', slug: assignment.slug })
  })

  const pendingUpdates: {
    postId: string | number
    postTitle: string
    postSlug: string
    target: AssignmentTarget
    currentAuthors: (string | number)[]
  }[] = []

  posts.docs.forEach((post: any) => {
    if (!post?.id || !post?.slug) return
    const postSlugKey = normalizeSlug(String(post.slug))
    const explicit = postSlugToAssignment.get(postSlugKey)
    let target = explicit || null
    let relevant = !!explicit
    if (!target && Array.isArray(post.categories)) {
      const categoryIds = post.categories
        .map((cat: any) => {
          if (typeof cat === 'string' || typeof cat === 'number') return String(cat)
          if (cat && typeof cat === 'object' && cat.id) return String(cat.id)
          return null
        })
        .filter((value: string | null): value is string => Boolean(value))
      for (const categoryId of categoryIds) {
        if (categoryIdToAssignment.has(categoryId)) {
          target = categoryIdToAssignment.get(categoryId) || null
          relevant = true
          break
        }
      }
    }
    if (!relevant || !target) return
    const currentAuthors = Array.isArray(post.authors)
      ? post.authors
          .map((author: any) => {
            if (typeof author === 'string' || typeof author === 'number') return author
            if (author && typeof author === 'object' && author.id) return author.id
            return null
          })
          .filter((value: string | number | null): value is string | number => value !== null)
      : []
    if (currentAuthors.length === 1 && String(currentAuthors[0]) === String(target.user.id)) return
    pendingUpdates.push({
      postId: post.id,
      postTitle: String(post.title || post.slug),
      postSlug: String(post.slug),
      target,
      currentAuthors,
    })
  })

  console.log(`📄 Vor fi actualizate ${pendingUpdates.length} articole`)

  const failures: string[] = []
  let updated = 0

  for (const item of pendingUpdates) {
    try {
      const postId = typeof item.postId === 'number' ? item.postId : Number(item.postId)
      if (Number.isNaN(postId)) {
        failures.push(`❌ ${item.postTitle} (${item.postSlug}): ID invalid`)
        continue
      }

      const authorId =
        typeof item.target.user.id === 'number' ? item.target.user.id : Number(item.target.user.id)

      if (Number.isNaN(authorId)) {
        failures.push(`❌ ${item.postTitle} (${item.postSlug}): Autor invalid`)
        continue
      }

      await payload.update({
        collection: 'posts',
        id: postId,
        data: {
          authors: [authorId],
        },
        overrideAccess: true,
        context: {
          disableRevalidate: true,
        },
      })
      updated += 1
      console.log(
        `✅ ${item.postTitle} → ${item.target.user.name} (${item.target.source}: ${item.target.slug})`,
      )
    } catch (error: any) {
      failures.push(`❌ ${item.postTitle} (${item.postSlug}): ${error?.message || error}`)
    }
  }

  if (missingUsers.length > 0) {
    console.log('\n⚠️  Autori care nu au fost găsiți:')
    missingUsers.forEach((message) => console.log(`   - ${message}`))
  }

  if (missingCategories.length > 0) {
    console.log('\n⚠️  Categorii care nu au fost găsite:')
    missingCategories.forEach((message) => console.log(`   - ${message}`))
  }

  if (failures.length > 0) {
    console.log('\n⚠️  Actualizări eșuate:')
    failures.forEach((message) => console.log(`   - ${message}`))
  }

  console.log('\n📊 Rezumat:')
  console.log(`   Actualizate: ${updated}`)
  console.log(`   Neschimbate: ${posts.docs.length - pendingUpdates.length}`)
  console.log(`   Probleme: ${failures.length}`)
}

run()
  .then(() => {
    console.log('\n🏁 Script finalizat')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Eroare la rularea scriptului:', error)
    process.exit(1)
  })
