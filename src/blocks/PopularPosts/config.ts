import type { Block } from 'payload'

export const PopularPosts: Block = {
  slug: 'popularPosts',
  labels: {
    singular: 'Popular Posts',
    plural: 'Popular Posts',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: 'Heading',
    },
    {
      name: 'subheading',
      type: 'text',
      label: 'Subheading',
    },
    {
      name: 'limit',
      type: 'number',
      label: 'Items Limit',
      defaultValue: 5,
      min: 1,
      max: 12,
    },
  ],
}

