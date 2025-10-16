import configPromise from '@payload-config'
import { getPayload } from 'payload'

/**
 * Gets all category IDs including the given category and all its descendants
 * This is useful for showing posts from a category and all its subcategories
 */
export async function getCategoryHierarchyIds(categoryId: number): Promise<number[]> {
  const payload = await getPayload({ config: configPromise })

  // Get all categories to build the hierarchy
  const allCategories = await payload.find({
    collection: 'categories',
    limit: 1000,
    overrideAccess: false,
    pagination: false,
  })

  const categoryMap = new Map<number, any>()
  allCategories.docs.forEach((category) => {
    if (category.id) {
      categoryMap.set(category.id, category)
    }
  })

  // Find all descendants of the given category
  const getAllDescendants = (parentId: number): number[] => {
    const descendants: number[] = []

    // Find all categories that have this category as parent
    for (const [id, category] of categoryMap) {
      if (
        category.parent === parentId ||
        (typeof category.parent === 'object' && category.parent?.id === parentId)
      ) {
        descendants.push(id)
        // Recursively get descendants of this category
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
  const payload = await getPayload({ config: configPromise })

  const childCategories = await payload.find({
    collection: 'categories',
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    where: {
      or: [
        {
          parent: {
            equals: parentId,
          },
        },
        {
          'parent.id': {
            equals: parentId,
          },
        },
      ],
    },
  })

  return childCategories.docs.map((category) => category.id).filter(Boolean) as number[]
}
