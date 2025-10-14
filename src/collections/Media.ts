import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      //required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  upload: {
    // R2 storage configured in payload.config.ts - no local staticDir needed
    // staticDir is omitted when using external storage (R2)
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    crop: true, // Enable cropping in admin panel
    // Enhanced image optimization settings
    formatOptions: {
      format: 'webp', // Use WebP for better compression
      options: {
        quality: 85, // Good balance between quality and file size
      },
    },
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
        height: 300,
        crop: 'centre', // Crop from center for thumbnails
        formatOptions: {
          format: 'webp',
          options: {
            quality: 80,
          },
        },
      },
      {
        name: 'square',
        width: 500,
        height: 500,
        crop: 'centre',
        formatOptions: {
          format: 'webp',
          options: {
            quality: 85,
          },
        },
      },
      {
        name: 'small',
        width: 600,
        withoutEnlargement: true, // Don't enlarge small images
        formatOptions: {
          format: 'webp',
          options: {
            quality: 85,
          },
        },
      },
      {
        name: 'medium',
        width: 900,
        withoutEnlargement: true,
        formatOptions: {
          format: 'webp',
          options: {
            quality: 85,
          },
        },
      },
      {
        name: 'large',
        width: 1400,
        withoutEnlargement: true,
        formatOptions: {
          format: 'webp',
          options: {
            quality: 90, // Higher quality for large images
          },
        },
      },
      {
        name: 'xlarge',
        width: 1920,
        withoutEnlargement: true,
        formatOptions: {
          format: 'webp',
          options: {
            quality: 90,
          },
        },
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'centre',
        formatOptions: {
          format: 'jpeg', // OG images should be JPEG for compatibility
          options: {
            quality: 90,
          },
        },
      },
    ],
  },
}
