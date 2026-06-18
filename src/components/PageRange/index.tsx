import React from 'react'
import { getTranslations } from 'next-intl/server'

export const PageRange = async (props: {
  className?: string
  collection?: 'posts'
  collectionLabels?: {
    plural?: string
    singular?: string
  }
  currentPage?: number
  limit?: number
  totalDocs?: number
}) => {
  const {
    className,
    collectionLabels: collectionLabelsFromProps,
    currentPage,
    limit,
    totalDocs,
  } = props

  const t = await getTranslations('Common')

  let indexStart = (currentPage ? currentPage - 1 : 1) * (limit || 1) + 1
  if (totalDocs && indexStart > totalDocs) indexStart = 0

  let indexEnd = (currentPage || 1) * (limit || 1)
  if (totalDocs && indexEnd > totalDocs) indexEnd = totalDocs

  // Posts are the only paginated collection; fall back to provided labels.
  const plural = collectionLabelsFromProps?.plural ?? t('postPlural')
  const singular = collectionLabelsFromProps?.singular ?? t('postSingular')

  return (
    <div className={[className, 'font-semibold'].filter(Boolean).join(' ')}>
      {(typeof totalDocs === 'undefined' || totalDocs === 0) && t('noResults')}
      {typeof totalDocs !== 'undefined' &&
        totalDocs > 0 &&
        `${indexStart}${indexStart > 0 ? ` - ${indexEnd}` : ''} ${t('of')} ${totalDocs} ${
          totalDocs > 1 ? plural : singular
        }`}
    </div>
  )
}
