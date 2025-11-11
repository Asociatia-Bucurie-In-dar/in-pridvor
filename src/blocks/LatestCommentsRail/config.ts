import type { Block } from 'payload'

export const LatestCommentsRail: Block = {
  slug: 'latestCommentsRail',
  labels: {
    singular: 'Latest Comments Rail',
    plural: 'Latest Comments Rail',
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
      defaultValue: 8,
      min: 1,
      max: 24,
    },
  ],
}

