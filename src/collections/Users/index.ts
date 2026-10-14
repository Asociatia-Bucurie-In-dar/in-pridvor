import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { revalidateSite } from '@/utilities/revalidate'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: authenticated,
    delete: authenticated,
    read: authenticated,
    update: authenticated,
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
  ],
  hooks: {
    afterChange: [
      ({ doc, previousDoc, operation }) => {
        // Author names are shown on posts, cards and author pages across the site.
        if (operation === 'update' && previousDoc?.name !== doc.name) revalidateSite()
        return doc
      },
    ],
  },
  timestamps: true,
}
