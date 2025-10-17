import type { Block } from 'payload'

export const HeroCarousel: Block = {
  slug: 'heroCarousel',
  interfaceName: 'HeroCarouselBlock',
  fields: [
    {
      name: 'populateBy',
      type: 'select',
      defaultValue: 'collection',
      options: [
        {
          label: 'Collection',
          value: 'collection',
        },
        {
          label: 'Individual Selection',
          value: 'selection',
        },
      ],
    },
    {
      name: 'relationTo',
      type: 'select',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'collection',
      },
      defaultValue: 'posts',
      label: 'Collections To Show',
      options: [
        {
          label: 'Posts',
          value: 'posts',
        },
      ],
    },
    {
      name: 'categories',
      type: 'relationship',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'collection',
      },
      hasMany: true,
      label: 'Categories To Show',
      relationTo: 'categories',
    },
    {
      name: 'limit',
      type: 'number',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'collection',
        step: 1,
      },
      defaultValue: 3,
      label: 'Number of Slides',
      min: 1,
      max: 10,
    },
    {
      name: 'selectedDocs',
      type: 'relationship',
      admin: {
        condition: (_, siblingData) => siblingData.populateBy === 'selection',
      },
      hasMany: true,
      label: 'Selection',
      relationTo: ['posts'],
    },
    {
      name: 'autoplayDelay',
      type: 'number',
      admin: {
        description: 'Autoplay delay in milliseconds',
        step: 1000,
      },
      defaultValue: 5000,
      label: 'Autoplay Delay (ms)',
      min: 2000,
      max: 10000,
    },
    {
      name: 'showNavigation',
      type: 'checkbox',
      defaultValue: true,
      label: 'Show Navigation Arrows',
    },
    {
      name: 'showPagination',
      type: 'checkbox',
      defaultValue: true,
      label: 'Show Pagination Dots',
    },
  ],
  labels: {
    plural: 'Hero Carousels',
    singular: 'Hero Carousel',
  },
}
