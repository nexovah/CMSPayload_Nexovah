import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
  ],
  upload: {
    staticDir: '../media',
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'thumbnail', width: 300 },
      { name: 'medium', width: 800 },
      { name: 'large', width: 1400 },
    ],
  },
}
