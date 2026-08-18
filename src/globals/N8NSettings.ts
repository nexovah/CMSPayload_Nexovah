import type { GlobalConfig } from 'payload'

// Connects site forms to n8n Webhook triggers. Kept as its own top-level
// admin menu entry (not nested inside Email Settings) so it's quick to find
// and doesn't get lost among SMTP/Security/etc tabs.
export const N8NSettings: GlobalConfig = {
  slug: 'n8n-settings',
  label: 'N8N Settings',
  admin: {
    description: 'Connect site forms to n8n Webhook triggers — every matching Lead submission is POSTed here in real time (fire-and-forget; a slow or unreachable n8n instance never blocks the visitor\'s form).',
  },
  access: { read: ({ req }) => Boolean(req.user) },
  fields: [
    {
      name: 'n8nWebhooks',
      type: 'array',
      label: 'N8N Webhooks',
      labels: { singular: 'Webhook', plural: 'Webhooks' },
      admin: {
        description: 'One row per form you want to trigger a workflow. Create a Webhook node in n8n (POST method), copy its Production URL here.',
      },
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: true },
        {
          name: 'formType',
          type: 'select',
          required: true,
          options: [
            { label: 'Design My Website Form', value: 'design-my-website' },
            { label: 'Get a Quote', value: 'quote' },
            { label: 'Contact Form', value: 'contact' },
          ],
          admin: { description: "Which form's submissions POST to this webhook. Only one enabled row per form type is used." },
        },
        {
          name: 'webhookUrl',
          type: 'text',
          required: true,
          label: 'n8n Webhook URL',
          admin: { placeholder: 'https://your-n8n-instance.com/webhook/xxxxxxxx', description: "The n8n Webhook trigger node's Production URL (POST method)." },
        },
        {
          name: 'label',
          type: 'text',
          label: 'Label (internal)',
          admin: { description: 'Optional — for your own reference only, e.g. "Design My Website → WhatsApp alert workflow".' },
        },
      ],
    },
  ],
}
