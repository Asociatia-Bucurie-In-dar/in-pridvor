import { HeaderClient } from './Component.client'
import { getCachedGlobal } from '@/utilities/getGlobals'
import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

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

  const sortByTitle = (arr: Category[]) => arr.sort((a, b) => a.title.localeCompare(b.title))

  const roots = sortByTitle([...(byParent.get('root') ?? [])])

  const childrenOf = (parentId: number) => sortByTitle([...(byParent.get(parentId) ?? [])])

  return { roots, childrenOf }
}

function toCategoryNavItems(categories: Category[]) {
  const { roots, childrenOf } = buildCategoryTree(categories)

  const result: NonNullable<Header['navItems']> = []

  for (const parent of roots) {
    const firstLevel = childrenOf(parent.id)

    const sublinks: NonNullable<NonNullable<Header['navItems']>[number]['sublinks']> = []

    for (const child of firstLevel) {
      sublinks.push({
        id: `cat-${child.id}`,
        link: {
          url: child.slug ? `categories/${child.slug}` : '/',
          label: child.title,
        },
      })

      const secondLevel = childrenOf(child.id)
      for (const grand of secondLevel) {
        sublinks.push({
          id: `cat-${grand.id}`,
          link: {
            url: grand.slug ? `categories/${grand.slug}` : '/',
            label: `— ${grand.title}`,
          },
        })
      }
    }

    result.push({
      id: `cat-${parent.id}`,
      link: {
        url: parent.slug ? `categories/${parent.slug}` : '/',
        label: parent.title,
      },
      sublinks: sublinks.length ? sublinks : null,
    })
  }

  return result
}

export async function Header() {
  const headerData = (await getCachedGlobal('header', 1)()) as Header

  const payload = await getPayload({ config: configPromise })
  const categoriesRes = await payload.find({
    collection: 'categories',
    limit: 1000,
    pagination: false,
    depth: 0,
    overrideAccess: false,
  })

  const categoryNav = toCategoryNavItems(categoriesRes.docs as Category[])
  const adminNav = headerData.navItems ?? []
  const mergedNav = [...categoryNav, ...adminNav]

  return <HeaderClient data={{ ...headerData, navItems: mergedNav }} />
}
