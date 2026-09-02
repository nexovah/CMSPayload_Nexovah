import type { CollectionConfig } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'

// The 2 canonical Design My Website plans (Step 3 checkout tabs) live here,
// identified by `planKey` — the fixed identifier the frontend sends to
// /api/create-order, so editing name/description/price never breaks
// checkout (the backend always looks up the live price by planKey, never
// trusts a price from the browser). Any other product — a one-off custom
// package sold manually via a Customer + payment link — also lives in this
// same collection, just with planKey left empty, since it's never meant to
// appear as a Step 3 tab.
export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Product', plural: 'Products' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'planKey', 'price', 'billingPeriod', 'status', 'updatedAt'],
    group: 'Sales',
    description: 'The two Design My Website payment plans. planKey is fixed — only name, description, price, and status are meant to be edited. Inactive plans are hidden from the Step 3 checkout tabs but can still be attached to a Customer manually.',
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: () => false,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'description',
      type: 'richText',
      editor: lexicalEditor(),
      admin: { description: 'Formatted plan description — shown on the Step 3 checkout tab and in expiry-reminder emails. Paste from anywhere; bold/lists/etc are preserved.' },
    },
    // Read-only, computed on every fetch from the richText above — the
    // frontend and the expiry-reminder emails consume this HTML string
    // directly instead of the raw Lexical JSON, without needing their own
    // lexical-to-HTML conversion logic.
    {
      name: 'descriptionHtml',
      type: 'text',
      virtual: true,
      admin: { hidden: true, readOnly: true },
      hooks: {
        afterRead: [
          ({ siblingData }) => {
            if (!siblingData?.description) return ''
            try {
              return convertLexicalToHTML({ data: siblingData.description })
            } catch {
              return ''
            }
          },
        ],
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
      admin: { description: 'Active plans show as a tab on Step 3 checkout. Inactive plans are hidden there but can still be attached to a Customer manually (e.g. for a custom payment link).' },
    },
    { name: 'price', type: 'number', required: true, admin: { description: 'Price in ₹ (rupees). This is the amount actually charged via Razorpay.' } },
    {
      name: 'billingPeriod',
      type: 'select',
      required: true,
      options: [
        { label: '1 Month', value: 'monthly' },
        { label: '1 Year', value: 'yearly' },
      ],
    },
    {
      name: 'planKey',
      type: 'select',
      unique: true,
      options: [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Yearly', value: 'yearly' },
      ],
      admin: {
        description:
          'Only set this for the 2 canonical Design My Website checkout plans (one Monthly, one Yearly — matches the plan key the frontend sends). Leave empty for any other, one-off, or custom manually-sold product — those are never shown on Step 3 checkout and are only ever attached to a Customer by hand.',
      },
    },
  ],
}
