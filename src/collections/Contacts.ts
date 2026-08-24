import type { CollectionConfig } from 'payload'
import { syncDripEnrollments } from '../hooks/syncDripEnrollments'

// Deduplicated customer records — one Contact can have many Leads over time
// (see syncContactAfterLeadChange). Separate from Leads per the requested split.
export const Contacts: CollectionConfig = {
  slug: 'contacts',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'phone', 'company', 'source', 'updatedAt'],
    group: 'CRM',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'phone', type: 'text' },
    { name: 'company', type: 'text' },
    {
      name: 'source',
      type: 'relationship',
      relationTo: 'lead-sources',
      admin: { description: 'Where this contact originally came from. Use "+ Add new" in this field to create a new source on the fly.' },
    },
    { name: 'note', type: 'richText', admin: { description: 'Internal note — not shown to the contact.' } },
    {
      name: 'groups',
      type: 'relationship',
      relationTo: 'contact-groups',
      hasMany: true,
      admin: { description: 'Lists/segments this contact belongs to — used to target email campaigns. Use "+ Add new" to create a group on the fly.' },
    },
    {
      name: 'unsubscribed',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Set automatically when this contact clicks "Unsubscribe" in a campaign email. Excluded from future campaign sends.' },
    },
    {
      name: 'leads',
      type: 'join',
      collection: 'leads',
      on: 'contact',
    },
  ],
  endpoints: [
    {
      // Public — reached from the {{unsubscribe_url}} merge tag in transactional
      // lead-reply emails (Get a Quote / Contact form receipts), not just
      // campaign sends, so it can't require an admin session.
      path: '/:id/unsubscribe',
      method: 'get',
      handler: async (req) => {
        const id = req.routeParams?.id as string
        try {
          await req.payload.update({ collection: 'contacts', id, data: { unsubscribed: true } })
        } catch {
          // fall through to the confirmation page regardless
        }
        return new Response(
          '<!doctype html><html><body style="font-family:sans-serif;padding:40px;text-align:center;color:#333;"><h2>You\'ve been unsubscribed</h2><p>You won\'t receive future emails from this list.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } },
        )
      },
    },
  ],
  hooks: {
    afterChange: [syncDripEnrollments],
  },
}
