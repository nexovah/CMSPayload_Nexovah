import type { CollectionConfig } from 'payload'

// One row per (drip campaign, contact) — tracks how far a given contact has
// progressed through a drip campaign's steps. Created the moment a contact
// enters the campaign's triggerGroup (or when the campaign is first
// activated, for contacts already in the group), and advanced by the
// scheduler in src/lib/automationSend.ts. Kept as a plain collection (not a
// custom canvas UI) since it's a debugging/visibility list, not something
// edited by hand.
export const CampaignEnrollments: CollectionConfig = {
  slug: 'campaign-enrollments',
  labels: { singular: 'Drip Enrollment', plural: 'Drip Enrollments' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['campaign', 'contact', 'status', 'currentStepIndex', 'nextSendAt', 'enrolledAt'],
    group: 'Campaigns',
    description: 'Per-contact progress through drip campaigns. Managed automatically — not intended to be edited by hand.',
    // Internal bookkeeping only — one row per (drip campaign, contact),
    // created/advanced entirely by the scheduler in automationSend.ts.
    // Hidden from the nav so it can't be mistaken for something to fill in
    // manually; automation code still reads/writes it fine via the Local
    // API, which bypasses these access checks.
    hidden: true,
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'campaign', type: 'relationship', relationTo: 'campaigns', required: true },
    { name: 'contact', type: 'relationship', relationTo: 'contacts', required: true },
    { name: 'currentStepIndex', type: 'number', defaultValue: 0 },
    { name: 'nextSendAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: ['active', 'completed', 'removed', 'unsubscribed'],
    },
    { name: 'enrolledAt', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    {
      name: 'history',
      type: 'json',
      defaultValue: [],
      admin: { description: 'Log of { stepIndex, sentAt } for each step actually sent to this contact.' },
    },
  ],
}
