import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'

export const Comments: CollectionConfig = {
  slug: 'comments',
  access: {
    create: anyone, // Anyone can create a comment
    delete: authenticated, // Only admins can delete
    read: anyone, // Anyone can read approved comments
    update: authenticated, // Only admins can update (for moderation)
  },
  admin: {
    defaultColumns: ['name', 'post', 'status', 'createdAt'],
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 100,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'comment',
      type: 'textarea',
      required: true,
      maxLength: 1000,
    },
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'approved',
      options: [
        {
          label: 'Approved',
          value: 'approved',
        },
        {
          label: 'Pending',
          value: 'pending',
        },
        {
          label: 'Rejected',
          value: 'rejected',
        },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
