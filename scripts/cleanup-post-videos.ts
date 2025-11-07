#!/usr/bin/env tsx

import { config as loadEnv } from 'dotenv'

loadEnv()

type LexicalNode = {
  type?: string
  fields?: Record<string, any>
  children?: LexicalNode[]
  text?: string
}

type CleanContext = {
  videoKeys: Set<string>
  keptVideoKeys: Set<string>
  removedBlocks: number
  removedLinks: number
  sanitizedUrls: number
  changed: boolean
}

const ignoredParams = new Set(['feature', 'si', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'igshid', 't', 'time_continue'])

function sanitizeRawUrl(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/\\u0026/gi, '&')
    .replace(/[\u00a0\u200b]/g, '')
    .trim()
    .replace(/^[<>"']+/, '')
    .replace(/[>"']+$/, '')
    .replace(/[).,!?;]+$/g, '')
}

function sanitizeVideoIdentifier(identifier: string | null | undefined): string {
  if (!identifier) return ''
  return identifier.replace(/\\u0026/gi, '&').split(/[?&#\s]/)[0].trim()
}

function canonicalizeVideoUrl(raw: string): { canonical: string; key: string } {
  const sanitized = sanitizeRawUrl(raw)
  if (!sanitized) {
    return { canonical: '', key: '' }
  }

  let normalized = sanitized
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`
  }

  let url: URL
  try {
    url = new URL(normalized)
  } catch {
    return { canonical: sanitized, key: sanitized.toLowerCase() }
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  const pathname = url.pathname

  if (host === 'youtu.be') {
    const videoId = sanitizeVideoIdentifier(pathname.replace(/^\/+/, '').split('/')[0])
    if (!videoId) {
      return { canonical: sanitized, key: sanitized.toLowerCase() }
    }
    return {
      canonical: `https://www.youtube.com/watch?v=${videoId}`,
      key: `youtube:${videoId.toLowerCase()}`,
    }
  }

  if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtube-nocookie.com') {
    if (pathname.startsWith('/shorts/')) {
      const shortId = sanitizeVideoIdentifier(pathname.split('/')[2] || '')
      if (!shortId) {
        return { canonical: sanitized, key: sanitized.toLowerCase() }
      }
      return {
        canonical: `https://www.youtube.com/shorts/${shortId}`,
        key: `youtube-short:${shortId.toLowerCase()}`,
      }
    }

    if (pathname.startsWith('/live/')) {
      const liveId = sanitizeVideoIdentifier(pathname.split('/')[2] || '')
      if (!liveId) {
        return { canonical: sanitized, key: sanitized.toLowerCase() }
      }
      return {
        canonical: `https://www.youtube.com/live/${liveId}`,
        key: `youtube-live:${liveId.toLowerCase()}`,
      }
    }

    if (pathname.startsWith('/embed/')) {
      const embedId = sanitizeVideoIdentifier(pathname.split('/')[2] || '')
      if (!embedId) {
        return { canonical: sanitized, key: sanitized.toLowerCase() }
      }
      return {
        canonical: `https://www.youtube.com/watch?v=${embedId}`,
        key: `youtube:${embedId.toLowerCase()}`,
      }
    }

    const videoId = sanitizeVideoIdentifier(url.searchParams.get('v'))
    if (videoId) {
      return {
        canonical: `https://www.youtube.com/watch?v=${videoId}`,
        key: `youtube:${videoId.toLowerCase()}`,
      }
    }
  }

  const params = Array.from(url.searchParams.entries()).filter(([key]) => !ignoredParams.has(key.toLowerCase()))
  params.sort(([a], [b]) => a.localeCompare(b))

  const filteredParams = new URLSearchParams()
  for (const [key, value] of params) {
    filteredParams.append(key, value)
  }

  const search = filteredParams.toString()
  const canonical = `${url.protocol}//${url.host}${pathname}${search ? `?${search}` : ''}`
  const key = `${host}${pathname.toLowerCase()}${search ? `?${search.toLowerCase()}` : ''}`

  return { canonical, key }
}

function collectVideoKeys(nodes: LexicalNode[] | undefined, target: Set<string>): void {
  if (!Array.isArray(nodes)) return
  for (const node of nodes) {
    if (!node || typeof node !== 'object') continue
    if (node.type === 'block' && node.fields?.blockType === 'videoEmbed') {
      const { key } = canonicalizeVideoUrl(String(node.fields?.url || ''))
      if (key) {
        target.add(key)
      }
    }
    if (Array.isArray(node.children)) {
      collectVideoKeys(node.children, target)
    }
  }
}

function cleanTextNode(node: LexicalNode, context: CleanContext): boolean {
  if (typeof node.text !== 'string') return false

  let workingText = node.text
  let changed = false
  const matches = [...workingText.matchAll(/https?:\/\/\S+/gi)]

  for (const match of matches) {
    const raw = match[0]
    const { key } = canonicalizeVideoUrl(raw)
    if (key && context.videoKeys.has(key)) {
      workingText = workingText.replace(raw, '')
      changed = true
      context.removedLinks++
    }
  }

  if (!changed) return false

  const cleaned = workingText.replace(/\s+/g, ' ').trim()
  if (!cleaned.length) {
    context.changed = true
    return true
  }

  node.text = workingText.replace(/\s{2,}/g, ' ')
  context.changed = true
  return false
}

function cleanLinkNode(node: LexicalNode, context: CleanContext): boolean {
  const url = typeof node.fields?.url === 'string' ? node.fields.url : ''
  if (!url) return false

  const { key } = canonicalizeVideoUrl(url)
  if (key && context.videoKeys.has(key)) {
    context.removedLinks++
    context.changed = true
    return true
  }

  return false
}

function cleanNodes(nodes: LexicalNode[] | undefined, context: CleanContext): void {
  if (!Array.isArray(nodes)) return

  let index = 0
  while (index < nodes.length) {
    const node = nodes[index]
    if (!node || typeof node !== 'object') {
      index++
      continue
    }

    if (node.type === 'block' && node.fields?.blockType === 'videoEmbed') {
      const rawUrl = String(node.fields?.url || '')
      const { canonical, key } = canonicalizeVideoUrl(rawUrl)

      if (canonical && canonical !== rawUrl) {
        node.fields.url = canonical
        context.sanitizedUrls++
        context.changed = true
      }

      if (!key) {
        index++
        continue
      }

      if (context.keptVideoKeys.has(key)) {
        nodes.splice(index, 1)
        context.removedBlocks++
        context.changed = true
        continue
      }

      context.keptVideoKeys.add(key)
      index++
      continue
    }

    if (node.type === 'text') {
      const shouldRemove = cleanTextNode(node, context)
      if (shouldRemove) {
        nodes.splice(index, 1)
        continue
      }
      index++
      continue
    }

    if (node.type === 'link') {
      const shouldRemove = cleanLinkNode(node, context)
      if (shouldRemove) {
        nodes.splice(index, 1)
        continue
      }
    }

    if (Array.isArray(node.children)) {
      cleanNodes(node.children, context)
      if (node.type === 'paragraph' && node.children.length === 0) {
        nodes.splice(index, 1)
        context.changed = true
        continue
      }
    }

    index++
  }
}

async function run(): Promise<void> {
  const payloadConfig = (await import('../src/payload.config.ts')).default
  const { getPayload } = await import('payload')

  const payload = await getPayload({ config: payloadConfig })

  const videoCategory = await payload.find({
    collection: 'categories',
    limit: 1,
    depth: 0,
    overrideAccess: true,
    where: {
      slug: {
        equals: 'video',
      },
    },
  })

  if (videoCategory.docs.length === 0) {
    console.error('Video category not found (slug "video"). Aborting.')
    process.exit(1)
  }

  const videoCategoryId = videoCategory.docs[0].id

  const posts = await payload.find({
    collection: 'posts',
    limit: 10000,
    depth: 0,
    overrideAccess: true,
  })

  let processed = 0
  let updated = 0
  let blocksRemoved = 0
  let linksRemoved = 0
  let urlsSanitized = 0
  let categoriesAdded = 0

  for (const post of posts.docs) {
    processed++

    const content = post.content ? JSON.parse(JSON.stringify(post.content)) : null
    const root = content?.root

    if (!root || !Array.isArray(root.children)) {
      continue
    }

    const videoKeys = new Set<string>()
    collectVideoKeys(root.children, videoKeys)

    if (videoKeys.size === 0) {
      continue
    }

    const context: CleanContext = {
      videoKeys,
      keptVideoKeys: new Set(),
      removedBlocks: 0,
      removedLinks: 0,
      sanitizedUrls: 0,
      changed: false,
    }

    cleanNodes(root.children, context)

    const finalVideoCount = context.keptVideoKeys.size
    const needsVideoCategory = finalVideoCount > 0

    const currentCategories = Array.isArray(post.categories)
      ? post.categories
          .map((cat: any) => {
            if (typeof cat === 'object' && cat !== null && 'id' in cat) {
              return (cat as any).id
            }
            return cat
          })
          .filter((value: any) => value !== null && value !== undefined)
      : []

    const normalizedCategoryIds = new Set<string | number>()
    currentCategories.forEach((value) => normalizedCategoryIds.add(value))

    let categoriesChanged = false
    if (needsVideoCategory) {
      const hasVideoCategory = Array.from(normalizedCategoryIds).some(
        (value) => String(value) === String(videoCategoryId),
      )
      if (!hasVideoCategory) {
        normalizedCategoryIds.add(videoCategoryId)
        categoriesChanged = true
        categoriesAdded++
      }
    }

    if (!context.changed && !categoriesChanged) {
      continue
    }

    const categoryArray = Array.from(normalizedCategoryIds).map((value) => {
      if (typeof value === 'number') return value
      const numeric = Number(value)
      return Number.isNaN(numeric) ? value : numeric
    })

    await payload.update({
      collection: 'posts',
      id: post.id,
      data: {
        content,
        categories: categoryArray,
      },
      overrideAccess: true,
      context: {
        disableRevalidate: true,
      },
    })

    updated++
    blocksRemoved += context.removedBlocks
    linksRemoved += context.removedLinks
    urlsSanitized += context.sanitizedUrls

    console.log(
      `✅ ${post.title || post.slug} — videos kept: ${finalVideoCount}, blocks removed: ${context.removedBlocks}, links removed: ${context.removedLinks}, urls fixed: ${context.sanitizedUrls}${categoriesChanged ? ', added video category' : ''}`,
    )
  }

  console.log('\n📊 Cleanup summary')
  console.log(`   Posts scanned: ${processed}`)
  console.log(`   Posts updated: ${updated}`)
  console.log(`   Video blocks removed: ${blocksRemoved}`)
  console.log(`   Duplicate links removed: ${linksRemoved}`)
  console.log(`   Video URLs sanitized: ${urlsSanitized}`)
  console.log(`   Video category added: ${categoriesAdded}`)
}

run()
  .then(() => {
    console.log('\n🏁 Cleanup finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Cleanup failed:', error)
    process.exit(1)
  })

