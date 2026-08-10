import type { CollectionConfig } from 'payload'

// Dedicated media library for campaign assets (separate from the site's
// general Media collection). Placeholder scaffold — features TBD.
export const CampaignMedia: CollectionConfig = {
  slug: 'campaign-media',
  labels: { singular: 'Campaign Media', plural: 'Media' },
  admin: {
    group: 'Campaigns',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  upload: {
    // See Media.ts — same reasoning, configurable persistent path in prod.
    staticDir: process.env.CAMPAIGN_MEDIA_DIR || '../campaign-media',
  },
  fields: [{ name: 'alt', type: 'text' }],
}
