import type { GlobalConfig } from 'payload'

// The 3-step expiry-reminder drip for Customers — fixed at exactly 3 steps
// (7 days before, 3 days before, on the expiry day itself), each with its
// own on/off toggle and email template picker (same template-picker UI
// pattern as Campaigns). Deliberately a fixed 3-field global, not an array,
// so an admin can't accidentally add/remove/reorder steps — the day offsets
// are baked into the send engine (see lib/expiryReminders.ts).
export const ExpiryReminders: GlobalConfig = {
  slug: 'expiry-reminders',
  label: 'Expiry Reminders',
  admin: {
    description: 'The 3-step email drip sent to Customers as their purchased package approaches expiry — 7 days before, 3 days before, and on the day it expires.',
    group: 'Sales',
  },
  access: { read: ({ req }) => Boolean(req.user) },
  fields: [
    {
      name: 'sevenDayReminder',
      type: 'group',
      label: '7 Days Before Expiry',
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: true },
        { name: 'template', type: 'relationship', relationTo: 'campaign-templates', label: 'Email Template' },
      ],
    },
    {
      name: 'threeDayReminder',
      type: 'group',
      label: '3 Days Before Expiry',
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: true },
        { name: 'template', type: 'relationship', relationTo: 'campaign-templates', label: 'Email Template' },
      ],
    },
    {
      name: 'expiryDayReminder',
      type: 'group',
      label: 'On Expiry Day',
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: true },
        { name: 'template', type: 'relationship', relationTo: 'campaign-templates', label: 'Email Template' },
      ],
    },
  ],
}
