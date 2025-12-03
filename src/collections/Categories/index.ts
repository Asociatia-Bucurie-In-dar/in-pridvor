import type { CollectionConfig } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'
import { slugField } from '@/fields/slug'
import { revalidateCategory, revalidateCategoryDelete } from './hooks/revalidateCategory'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultSort: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        description: 'Select a parent category to create a hierarchy',
        position: 'sidebar',
      },
      label: 'Parent Category',
    },
    ...slugField(),
    {
      name: 'invisibleInHeader',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Exclude this category from the top navigation menu',
        position: 'sidebar',
      },
      label: 'Hide from header',
    },
    {
      name: 'displayOrder',
      type: 'number',
      required: false,
      admin: {
        description:
          'Controls order of top-level categories in the header. Lower numbers appear first. Leave empty for default ordering.',
        position: 'sidebar',
      },
      defaultValue: 0,
    },
  ],
  hooks: {
    afterChange: [revalidateCategory],
    afterDelete: [revalidateCategoryDelete],
  },
}
