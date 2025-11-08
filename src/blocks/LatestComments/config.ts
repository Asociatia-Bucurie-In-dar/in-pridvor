import type { Block } from 'payload'

export const LatestComments: Block = {
  slug: 'latestComments',
  labels: {
    singular: 'Latest Comments',
    plural: 'Latest Comments',
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

