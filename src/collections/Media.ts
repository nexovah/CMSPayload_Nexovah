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
    // Configurable so production can point at a persistent absolute path
    // outside the versioned deploy folder (which gets replaced on every
    // deploy, wiping anything stored relative to it) — same reasoning as
    // DATABASE_URI. Falls back to the local relative path for dev.
    staticDir: process.env.MEDIA_DIR || '../media',
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'thumbnail', width: 300 },
      { name: 'medium', width: 800 },
      { name: 'large', width: 1400 },
    ],
  },
}
