import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'

import type { Header, Category } from '@/payload-types'

function buildCategoryTree(categories: Category[]) {
  const byParent = new Map<number | 'root', Category[]>()
  const getParentKey = (c: Category) => {
    const p = c.parent
    if (p === null || p === undefined) return 'root' as const
    if (typeof p === 'object' && p.id) return p.id as number
    if (typeof p === 'number') return p as number
    return 'root' as const
  }

  for (const c of categories) {
    const key = getParentKey(c)
    const arr = byParent.get(key)
    if (arr) arr.push(c)
    else byParent.set(key, [c])
  }

  // Sort top-level categories by `displayOrder` (number). Lower values appear first.
  // If `displayOrder` is equal or missing, fall back to `createdAt`, then `title` for deterministic order.
  const sortRootsByDisplayOrder = (arr: Category[]) =>
    arr.sort((a, b) => {
      const aOrder = typeof (a as any).displayOrder === 'number' ? (a as any).displayOrder : 0
      const bOrder = typeof (b as any).displayOrder === 'number' ? (b as any).displayOrder : 0

      if (aOrder !== bOrder) return aOrder - bOrder

      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (aTime !== bTime) return aTime - bTime

      return (a.title || '').localeCompare(b.title || '')
    })

  // Keep child categories sorted alphabetically by title
  const sortAlphabetically = (arr: Category[]) =>
    arr.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ro'))

  const roots = sortRootsByDisplayOrder([...(byParent.get('root') ?? [])])

  const childrenOf = (parentId: number) => sortAlphabetically([...(byParent.get(parentId) ?? [])])

  return { roots, childrenOf }
}

function toCategoryNavItems(categories: Category[]) {
  const { roots, childrenOf } = buildCategoryTree(categories)

  const result: NonNullable<Header['navItems']> = []

  for (const parent of roots) {
    const firstLevel = childrenOf(parent.id)

    const sublinks: NonNullable<NonNullable<Header['navItems']>[number]['sublinks']> = []

    for (const child of firstLevel) {
      const secondLevel = childrenOf(child.id)

      const children = secondLevel.map((grand) => ({
        id: `cat-${grand.id}`,
        link: {
          url: grand.slug ? `/categories/${grand.slug}` : '/',
          label: grand.title,
        },
      }))

      sublinks.push({
        id: `cat-${child.id}`,
        link: {
          url: child.slug ? `/categories/${child.slug}` : '/',
          label: child.title,
        },
        children: children.length ? children : null,
      })
    }

    result.push({
      id: `cat-${parent.id}`,
      link: {
        url: parent.slug ? `/categories/${parent.slug}` : '/',
        label: parent.title,
      },
      sublinks: sublinks.length ? sublinks : null,
    })
  }

  return result
}

const getCachedCategories = unstable_cache(
  async () => {
    const payload = await getPayload({ config: configPromise })
    const res = await payload.find({
      collection: 'categories',
      limit: 1000,
      pagination: false,
      depth: 0,
      overrideAccess: false,
      select: {
        title: true,
        slug: true,
        parent: true,
        displayOrder: true,
        createdAt: true,
        invisibleInHeader: true,
      } as any,
    })
    return res.docs as Category[]
  },
  ['header-categories'],
  { tags: ['categories-header'] },
)

export async function Header() {
  const headerData = (await getCachedGlobal('header', 1)()) as Header

  const allCategories = await getCachedCategories()

  const categoryNav = toCategoryNavItems(
    allCategories.filter((category) => !(category as any).invisibleInHeader),
  )
  const adminNav = headerData.navItems ?? []
  const mergedNav = [...categoryNav, ...adminNav]

  return <HeaderClient data={{ ...headerData, navItems: mergedNav }} />
}
