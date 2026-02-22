import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

const getCachedAllCategories = unstable_cache(
  async () => {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'categories',
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      depth: 0,
      select: { id: true, parent: true } as any,
    })
    return result.docs.map((c) => ({
      id: c.id,
      parent: typeof c.parent === 'object' ? c.parent?.id : c.parent,
    }))
  },
  ['all-categories-hierarchy'],
  { tags: ['categories-header'] },
)

export async function getCategoryHierarchyIds(categoryId: number): Promise<number[]> {
  const allCategories = await getCachedAllCategories()

  const categoryMap = new Map<number, { id: number; parent: number | null | undefined }>()
  for (const category of allCategories) {
    if (category.id) {
      categoryMap.set(category.id, category)
    }
  }

  // Find all descendants of the given category
  const getAllDescendants = (parentId: number): number[] => {
    const descendants: number[] = []

    // Find all categories that have this category as parent
    for (const [id, category] of categoryMap) {
      if (category.parent === parentId) {
        descendants.push(id)
        descendants.push(...getAllDescendants(id))
      }
    }

    return descendants
  }

  // Return the original category ID plus all its descendants
  const descendantIds = getAllDescendants(categoryId)
  return [categoryId, ...descendantIds]
}

/**
 * Gets all category IDs that have the given category as a parent (direct children only)
 */
export async function getDirectChildCategoryIds(parentId: number): Promise<number[]> {
  const allCategories = await getCachedAllCategories()
  return allCategories
    .filter((c) => c.parent === parentId)
    .map((c) => c.id)
    .filter(Boolean) as number[]
}
