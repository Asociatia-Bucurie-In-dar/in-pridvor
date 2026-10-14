import React from 'react'
import { getLocale, getTranslations } from 'next-intl/server'

import { getLatestComments } from '@/utilities/getLatestComments'

import { LatestCommentsRailClient } from './Component.client'

const truncate = (value: string, length: number) => {
  if (!value) return ''
  const condensed = value.trim().replace(/\s+/g, ' ')
  if (condensed.length <= length) return condensed
  return `${condensed.slice(0, length - 1).trimEnd()}…`
}

type LatestCommentsRailBlockProps = {
  heading?: string
  subheading?: string
  limit?: number
}

export const LatestCommentsRailBlock: React.FC<LatestCommentsRailBlockProps> = async (props) => {
  const t = await getTranslations('Comments')
  const limit =
    typeof props.limit === 'number' && Number.isFinite(props.limit) && props.limit > 0
      ? Math.min(props.limit, 24)
      : 8
  const comments = await getLatestComments(limit, await getLocale())

  const items = comments.map((comment) => {
    const postSlug = comment.post?.slug ?? null
    const postTitle = comment.post?.title || t('unknownArticle')

    return {
      id: comment.id,
      name: comment.name || t('anonymousReader'),
      createdAt: comment.createdAt,
      body: truncate(comment.comment || '', 220),
      href: postSlug ? `/posts/${postSlug}` : '#',
      postTitle,
    }
  })

  return (
    <LatestCommentsRailClient
      heading={props.heading || t('railHeading')}
      subheading={props.subheading || t('railSubheading')}
      items={items}
    />
  )
}
