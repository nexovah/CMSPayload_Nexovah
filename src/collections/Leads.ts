import type { CollectionConfig } from 'payload'
import { syncContactAfterLeadChange } from '../hooks/syncContact'
import { defaultLeadSourceToWebsite } from '../hooks/defaultLeadSource'
import { sendLeadAutoReply } from '../hooks/sendLeadAutoReply'
import { forwardLeadToN8n } from '../hooks/n8nWebhook'
import { sendMetaLeadCapiEvent } from '../hooks/metaCapi'

// The "CRM" — every Contact form + Get a Quote form submission lands here,
// tagged by formType so the two are filterable without needing two collections.
export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'formType', 'source', 'email', 'phone', 'companyName', 'serviceCategory', 'createdAt'],
    group: 'CRM',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => true, // public form submissions
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    {
      name: 'formType',
      type: 'select',
      required: true,
      options: [
        { label: 'Contact Form', value: 'contact' },
        { label: 'Get a Quote', value: 'quote' },
        { label: 'Design My Website Form', value: 'design-my-website' },
        { label: 'CRM Form', value: 'crm' },
      ],
    },
    { name: 'companyName', type: 'text' },
    {
      name: 'website',
      type: 'text',
      admin: { description: 'e.g. https://example.com — must include a valid domain extension (.com, .in, .eu, etc).' },
      validate: (value: string | null | undefined) => {
        if (!value) return true
        const domainPattern = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([/?#].*)?$/
        return domainPattern.test(value) || 'Enter a valid website URL (e.g. https://example.com, .in, .eu).'
      },
    },
    {
      name: 'serviceCategory',
      type: 'select',
      admin: { description: 'Step 2 of the Get a Quote form — optional.' },
      options: [
        { label: 'UI/UX Design', value: 'ui-ux-design' },
        { label: 'Web Design', value: 'web-design' },
        { label: 'Application Development', value: 'application-development' },
        { label: 'AI Powered Website', value: 'ai-powered-website' },
        { label: 'AI Powered Social Media Design', value: 'ai-powered-social-media-design' },
        { label: 'Mobile App Development', value: 'mobile-app-development' },
        { label: 'Automation Service Integration', value: 'automation-service-integration' },
        { label: 'Branding Design', value: 'branding-design' },
        { label: 'Custom Services', value: 'custom-services' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'timelineDays',
      type: 'number',
      label: 'Timeline (days)',
      admin: { description: 'Requested project timeline, in total days — Get a Quote step 2, optional.' },
    },
    {
      name: 'budgetCurrency',
      type: 'select',
      admin: { description: 'Auto-detected from the visitor\'s country (India = INR, elsewhere = USD) at submission time.' },
      options: [
        { label: 'INR', value: 'INR' },
        { label: 'USD', value: 'USD' },
      ],
    },
    {
      name: 'budget',
      type: 'select',
      admin: { description: 'Get a Quote step 2, optional. Options shown to the visitor depend on budgetCurrency.' },
      options: [
        { label: 'Under 5K INR', value: 'inr-under-5k' },
        { label: '5K-30K INR', value: 'inr-5k-30k' },
        { label: '30K-100K INR', value: 'inr-30k-100k' },
        { label: '1L+ INR', value: 'inr-1l-plus' },
        { label: '5L+ INR', value: 'inr-5l-plus' },
        { label: '10L+ INR', value: 'inr-10l-plus' },
        { label: 'Below $100', value: 'usd-under-100' },
        { label: '$100 - $500', value: 'usd-100-500' },
        { label: '$500 - $1000', value: 'usd-500-1000' },
        { label: '$1000 - $2000', value: 'usd-1000-2000' },
        { label: '$2000 - $5000', value: 'usd-2000-5000' },
        { label: '$5000 - $10000', value: 'usd-5000-10000' },
        { label: '$10000 Above', value: 'usd-10000-above' },
      ],
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'Message / Project Scope',
      admin: { description: 'Labeled "Message" on the Contact form, "Project Scope" on the Get a Quote form.' },
    },
    {
      name: 'source',
      type: 'relationship',
      relationTo: 'lead-sources',
      admin: { description: 'Where this lead came from. Use "+ Add new" in this field to create a new source on the fly.' },
    },
    { name: 'sourcePage', type: 'text' },
    { name: 'utmSource', type: 'text' },
    { name: 'utmMedium', type: 'text' },
    { name: 'utmCampaign', type: 'text' },
    {
      name: 'metaEventId',
      type: 'text',
      admin: {
        hidden: true,
        description: 'Client-generated id sent with the form submission — reused as the Meta Pixel event_id so the browser-side fbq(\'track\', \'Lead\') and this server-side Conversions API send get deduplicated as one event, not counted twice.',
      },
    },
    { name: 'contact', type: 'relationship', relationTo: 'contacts', admin: { readOnly: true } },
    { name: 'note', type: 'richText', admin: { description: 'Internal note — not shown to the lead/contact.' } },
  ],
  hooks: {
    beforeChange: [defaultLeadSourceToWebsite],
    afterChange: [syncContactAfterLeadChange, sendLeadAutoReply, forwardLeadToN8n, sendMetaLeadCapiEvent],
  },
}
