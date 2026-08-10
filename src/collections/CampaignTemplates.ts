import type { CollectionConfig, Where } from 'payload'

const DEFAULT_HTML = `<!doctype html>
<html>
  <head>
    <title>{{ .Campaign.Subject }}</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">
    <base target="_blank">
    <style id="nx-auto-styles">
      body {
        background-color: #F0F1F3;
        font-family: 'Helvetica Neue', 'Segoe UI', Helvetica, sans-serif;
        font-size: 15px;
        line-height: 26px;
        margin: 0;
        color: #444;
      }
      .wrap {
        background-color: #fff;
        padding: 30px;
        max-width: 525px;
        margin: 0 auto;
        border-radius: 5px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      {{ template "content" . }}
    </div>
  </body>
</html>
`

// Fills the merge tags this app supports with sample data, purely for the
// admin "Preview" button — never used for actually sending mail.
function renderPreviewHtml(rawHtml: string): string {
  return rawHtml
    .replace(/\{\{\s*\.Campaign\.Subject\s*\}\}/g, 'Your Autumn Sale Starts Now')
    .replace(/\{\{\s*\.Subscriber\.Name\s*\}\}/g, 'Jordan')
    .replace(/\{\{\s*template\s+"content"\s+\.\s*\}\}/g, '<p>This is a preview of your email content.</p>')
}

export const CampaignTemplates: CollectionConfig = {
  slug: 'campaign-templates',
  labels: { singular: 'Template', plural: 'Templates' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'status', 'isDefault', 'updatedAt'],
    group: 'Campaigns',
    description: 'Reusable HTML email templates for campaigns and transactional mail.',
    preview: (doc) => `/api/campaign-templates/${doc.id}/preview`,
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  endpoints: [
    {
      path: '/:id/preview',
      method: 'get',
      handler: async (req) => {
        const id = req.routeParams?.id as string
        const doc = await req.payload.findByID({ collection: 'campaign-templates', id, depth: 0 })
        if (!doc) return new Response('Not found', { status: 404 })
        return new Response(renderPreviewHtml(doc.rawHtml || ''), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, originalDoc }) => {
        // Only one template can be the default at a time.
        if (data.isDefault) {
          const and: Where[] = [{ isDefault: { equals: true } }]
          if (originalDoc?.id) and.push({ id: { not_equals: originalDoc.id } })
          await req.payload.update({ collection: 'campaign-templates', where: { and }, data: { isDefault: false } })
          data.status = 'active'
        }
        return data
      },
    ],
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (originalDoc?.isDefault && data && data.status === 'inactive' && data.isDefault !== false) {
          throw new Error('Cannot deactivate the default template. Set another template as default first.')
        }
        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const doc = await req.payload.findByID({ collection: 'campaign-templates', id, depth: 0 })
        if (doc?.isDefault) {
          throw new Error('Cannot delete the default template. Set another template as default first.')
        }
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'campaign_html',
      options: [
        { label: 'Campaign / HTML', value: 'campaign_html' },
        { label: 'Campaign / Visual', value: 'campaign_visual' },
        { label: 'Transactional', value: 'transactional' },
      ],
    },
    { name: 'status', type: 'select', defaultValue: 'active', options: ['active', 'inactive'] },
    {
      name: 'isDefault',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Used as the default template when a campaign has none selected. Only one template can be default.' },
    },
    { name: 'previewText', type: 'text', admin: { description: 'Optional short subtitle shown under the name in the templates list.' } },
    {
      name: 'templateEditor',
      type: 'ui',
      admin: {
        components: { Field: '/components/admin/campaigns/TemplateEditorField#TemplateEditorField' },
      },
    },
    // Ground-truth data, edited only through the visual editor above —
    // hidden here so the form doesn't show two disconnected controls for
    // the same content.
    {
      name: 'rawHtml',
      // Plain textarea, not the `code` field — the `code` field mounts a
      // Monaco editor internally, and Monaco inside an `admin.hidden` (zero-size)
      // container triggers a ResizeObserver retry loop that shows up in React
      // as "Maximum update depth exceeded". This field is never shown to the
      // user directly (the visual editor above reads/writes it), so a plain
      // string field is all it needs to be.
      type: 'textarea',
      required: true,
      defaultValue: DEFAULT_HTML,
      admin: { hidden: true },
    },
    {
      name: 'styles',
      type: 'group',
      admin: { hidden: true },
      fields: [
        { name: 'backdropColor', type: 'text', defaultValue: '#F0F1F3' },
        { name: 'canvasColor', type: 'text', defaultValue: '#FFFFFF' },
        { name: 'canvasBorderColor', type: 'text', defaultValue: '' },
        { name: 'canvasBorderRadius', type: 'number', defaultValue: 5 },
        { name: 'fontFamily', type: 'select', defaultValue: 'modern-sans', options: ['modern-sans', 'classic-serif', 'monospace', 'rounded-sans'] },
        { name: 'textColor', type: 'text', defaultValue: '#444444' },
        { name: 'outlookCompatibility', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
}
