import type { CollectionConfig } from 'payload'

// Campaign performance analytics. Placeholder scaffold — features TBD.
export const CampaignAnalytics: CollectionConfig = {
  slug: 'campaign-analytics',
  labels: { singular: 'Analytics Record', plural: 'Analytics' },
  admin: {
    useAsTitle: 'id',
    group: 'Campaigns',
    components: {
      views: {
        list: {
          Component: '/components/admin/campaigns/AnalyticsListView#AnalyticsListView',
        },
      },
    },
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'campaign', type: 'relationship', relationTo: 'campaigns' },
  ],
}
