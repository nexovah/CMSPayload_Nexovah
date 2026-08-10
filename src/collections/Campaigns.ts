import type { CollectionConfig } from 'payload'
import { sendEmail, SendEmailError } from '../lib/sendEmail'
import { mergeContentIntoTemplate, substituteMergeTags, executeCampaignSend } from '../lib/campaignSend'
import { activateDripCampaign, pauseDripCampaign } from '../lib/automationSend'

// "All Campaigns" — mirrors the listmonk-style campaign creation flow: a
// Campaign tab (recipients/subject/from/format), a Content tab (the actual
// message body, wrapped by an optional CampaignTemplates layout), and
// lightweight Attributes/Archive tabs. Sending is real: /send fires
// immediately or schedules for `sendAt` (picked up by the interval scheduler
// registered in payload.config.ts's onInit).
export const Campaigns: CollectionConfig = {
  slug: 'campaigns',
  labels: { singular: 'Campaign', plural: 'All Campaigns' },
  admin: {
    useAsTitle: 'name',
    // Payload always makes the FIRST active column the clickable link to the
    // edit view — `status` was first, and its custom pill Cell doesn't render
    // a link, so nothing in the row was clickable. `name` must be first.
    defaultColumns: ['name', 'campaignType', 'status', 'contactGroups', 'createdAt', 'views', 'clicks', 'sentCount', 'bounces'],
    group: 'Campaigns',
    description: 'Email campaigns sent to one or more Contact Groups.',
    // `views.list.actions` renders in the top app-header icon tray, not
    // next to "Create New" — `beforeListTable` renders directly above the
    // data table, in the same header row as "Create New", which is where
    // this needs to visually sit.
    components: { beforeListTable: ['/components/admin/campaigns/DripCampaignButton#DripCampaignButton'] },
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  endpoints: [
    {
      path: '/:id/send-test',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        const id = req.routeParams?.id as string
        let body: { emails?: string[] } = {}
        try {
          body = req.json ? await req.json() : {}
        } catch {
          // no body
        }
        const emails = (body.emails ?? []).map((e) => e.trim()).filter(Boolean)
        if (emails.length === 0) {
          return new Response(JSON.stringify({ error: 'No recipient e-mail addresses provided.' }), { status: 400 })
        }

        const campaign = await req.payload.findByID({ collection: 'campaigns', id, depth: 0 })
        if (!campaign) return new Response(JSON.stringify({ error: 'Campaign not found.' }), { status: 404 })

        let html = campaign.content || ''
        if (campaign.template) {
          const templateId = typeof campaign.template === 'object' ? campaign.template.id : campaign.template
          const template = await req.payload.findByID({ collection: 'campaign-templates', id: templateId, depth: 0 })
          if (template?.rawHtml) html = mergeContentIntoTemplate(template.rawHtml, html)
        }
        if (!html) {
          return new Response(JSON.stringify({ error: 'This campaign has no content to send yet.' }), { status: 400 })
        }

        const subject = `[TEST] ${campaign.subject || campaign.name}`
        try {
          for (const to of emails) {
            const merged = substituteMergeTags(html, { name: 'Test User', email: to }, subject)
            await sendEmail(req.payload, { to, subject, html: merged, from: campaign.fromAddress || undefined })
          }
        } catch (err) {
          const message = err instanceof SendEmailError ? err.message : err instanceof Error ? err.message : 'Failed to send test e-mail.'
          return new Response(JSON.stringify({ error: message }), { status: 502 })
        }

        return new Response(JSON.stringify({ success: true, sentTo: emails }), { headers: { 'Content-Type': 'application/json' } })
      },
    },
    {
      path: '/:id/send',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        const id = req.routeParams?.id as string

        const campaign = await req.payload.findByID({ collection: 'campaigns', id, depth: 0 })
        if (!campaign) return new Response(JSON.stringify({ error: 'Campaign not found.' }), { status: 404 })
        if (campaign.status === 'running') {
          return new Response(JSON.stringify({ error: 'This campaign is already sending.' }), { status: 409 })
        }
        if (campaign.status === 'finished') {
          return new Response(JSON.stringify({ error: 'This campaign has already been sent.' }), { status: 409 })
        }

        // Scheduled for later — just flip status, the background scheduler
        // (registered in payload.config.ts) picks it up when sendAt arrives.
        if (campaign.sendLater && campaign.sendAt && new Date(campaign.sendAt) > new Date()) {
          await req.payload.update({ collection: 'campaigns', id, data: { status: 'scheduled' } })
          return new Response(JSON.stringify({ success: true, scheduled: true, sendAt: campaign.sendAt }), { headers: { 'Content-Type': 'application/json' } })
        }

        try {
          await executeCampaignSend(req.payload, id)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to send campaign.'
          return new Response(JSON.stringify({ error: message }), { status: 400 })
        }

        return new Response(JSON.stringify({ success: true, scheduled: false }), { headers: { 'Content-Type': 'application/json' } })
      },
    },
    {
      path: '/:id/cancel-schedule',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        const id = req.routeParams?.id as string
        const campaign = await req.payload.findByID({ collection: 'campaigns', id, depth: 0 })
        if (!campaign) return new Response(JSON.stringify({ error: 'Campaign not found.' }), { status: 404 })
        if (campaign.status !== 'scheduled') {
          return new Response(JSON.stringify({ error: 'This campaign is not currently scheduled.' }), { status: 409 })
        }
        await req.payload.update({ collection: 'campaigns', id, data: { status: 'draft', sendLater: false } })
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
      },
    },
    {
      path: '/:id/activate-drip',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        const id = req.routeParams?.id as string
        try {
          const result = await activateDripCampaign(req.payload, id)
          return new Response(JSON.stringify({ success: true, ...result }), { headers: { 'Content-Type': 'application/json' } })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to activate drip campaign.'
          return new Response(JSON.stringify({ error: message }), { status: 400 })
        }
      },
    },
    {
      path: '/:id/pause-drip',
      method: 'post',
      handler: async (req) => {
        if (!req.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        const id = req.routeParams?.id as string
        try {
          await pauseDripCampaign(req.payload, id)
          return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to pause drip campaign.'
          return new Response(JSON.stringify({ error: message }), { status: 400 })
        }
      },
    },
    // The three below are public — hit by the recipient's mail client/browser
    // when it loads the tracking pixel, follows a rewritten link, or clicks
    // "Unsubscribe", not by a logged-in admin. No req.user check on purpose.
    {
      path: '/:id/open',
      method: 'get',
      handler: async (req) => {
        const id = req.routeParams?.id as string
        try {
          const campaign = await req.payload.findByID({ collection: 'campaigns', id, depth: 0 })
          if (campaign) {
            await req.payload.update({ collection: 'campaigns', id, data: { views: (campaign.views ?? 0) + 1 } })
          }
        } catch {
          // never let tracking failures surface to the recipient
        }
        const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')
        return new Response(TRANSPARENT_GIF, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } })
      },
    },
    {
      path: '/:id/click',
      method: 'get',
      handler: async (req) => {
        const id = req.routeParams?.id as string
        const target = req.searchParams?.get('u') || '/'
        try {
          const campaign = await req.payload.findByID({ collection: 'campaigns', id, depth: 0 })
          if (campaign) {
            await req.payload.update({ collection: 'campaigns', id, data: { clicks: (campaign.clicks ?? 0) + 1 } })
          }
        } catch {
          // never block the redirect on a tracking failure
        }
        return Response.redirect(target, 302)
      },
    },
    {
      path: '/:id/unsubscribe',
      method: 'get',
      handler: async (req) => {
        const id = req.routeParams?.id as string
        const contactId = req.searchParams?.get('c')
        try {
          if (contactId) {
            await req.payload.update({ collection: 'contacts', id: contactId, data: { unsubscribed: true } })
          }
          const campaign = await req.payload.findByID({ collection: 'campaigns', id, depth: 0 })
          if (campaign) {
            await req.payload.update({ collection: 'campaigns', id, data: { unsubscribes: (campaign.unsubscribes ?? 0) + 1 } })
          }
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
  fields: [
    {
      // Drives whether this doc is a one-shot Campaign or a recurring Drip
      // Campaign. Set once at creation (via the "Drip Campaign" list action
      // button's `?campaignType=drip` query param, read by the custom
      // component below) and generally left alone afterward — every other
      // field's visibility branches off this value.
      name: 'campaignType',
      type: 'select',
      defaultValue: 'single',
      options: [
        { label: 'Campaign', value: 'single' },
        { label: 'Drip Campaign', value: 'drip' },
      ],
      admin: {
        position: 'sidebar',
        components: { Field: '/components/admin/campaigns/CampaignTypeField#CampaignTypeField' },
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Campaign',
          fields: [
            { name: 'name', type: 'text', required: true, admin: { description: 'Internal name — not shown to recipients.' } },
            { name: 'subject', type: 'text', admin: { condition: (data) => data?.campaignType !== 'drip' } },
            { name: 'fromAddress', type: 'text', label: 'From address', defaultValue: 'Nexovah <noreply@nexovah.com>' },
            {
              name: 'contactGroups',
              type: 'relationship',
              relationTo: 'contact-groups',
              hasMany: true,
              label: 'Contact Group',
              admin: {
                description: 'Which Contact Group(s) this campaign sends to.',
                condition: (data) => data?.campaignType !== 'drip',
                components: { Cell: '/components/admin/campaigns/ContactGroupCell#ContactGroupCell' },
              },
            },
            {
              name: 'messenger',
              type: 'select',
              defaultValue: 'email',
              options: [{ label: 'Email', value: 'email' }],
            },
            { name: 'tags', type: 'text', hasMany: true, admin: { description: 'Press enter after each tag.' } },
            {
              type: 'row',
              admin: { condition: (data) => data?.campaignType !== 'drip' },
              fields: [
                { name: 'sendLater', type: 'checkbox', label: 'Send later', defaultValue: false },
                { name: 'sendAt', type: 'date', label: 'Send date/time', admin: { condition: (data) => Boolean(data?.sendLater), date: { pickerAppearance: 'dayAndTime' } } },
              ],
            },
            {
              name: 'customHeaders',
              type: 'array',
              label: 'Custom headers',
              admin: { initCollapsed: true, description: 'Optional custom SMTP headers attached to every email in this campaign.' },
              fields: [
                { name: 'key', type: 'text', required: true },
                { name: 'value', type: 'text', required: true },
              ],
            },
          ],
        },
        {
          label: 'Drip Steps',
          admin: { condition: (data) => data?.campaignType === 'drip' },
          fields: [
            {
              name: 'triggerGroup',
              type: 'relationship',
              relationTo: 'contact-groups',
              label: 'Trigger Group',
              admin: {
                description:
                  'The Contact Group that drives this drip. Every current member is enrolled the moment this campaign is activated; any contact added to this group later is automatically enrolled from Step 1 at that time.',
              },
            },
            {
              name: 'stepsBuilder',
              type: 'ui',
              admin: { components: { Field: '/components/admin/campaigns/AutomationStepsField#AutomationStepsField' } },
            },
            // Ground truth for the builder above — array of
            // { id, order, delayValue, delayUnit, templateId, subject }.
            // `json` not `array`, same reason as `attachments` below: a
            // custom UI component needs to read/write a literal array.
            { name: 'steps', type: 'json', defaultValue: [], admin: { hidden: true } },
          ],
        },
        {
          label: 'Content',
          admin: { condition: (data) => data?.campaignType !== 'drip' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'format',
                  type: 'select',
                  defaultValue: 'rich_text',
                  options: [
                    { label: 'Rich text', value: 'rich_text' },
                    { label: 'Raw HTML', value: 'raw_html' },
                    { label: 'Markdown', value: 'markdown' },
                    { label: 'Plain text', value: 'plain_text' },
                    { label: 'Visual', value: 'visual' },
                  ],
                },
                {
                  name: 'template',
                  type: 'relationship',
                  relationTo: 'campaign-templates',
                  admin: { description: 'Optional layout this content is wrapped in when sent/previewed. Leave empty to send as-is.' },
                },
              ],
            },
            {
              name: 'contentEditor',
              type: 'ui',
              admin: { components: { Field: '/components/admin/campaigns/ContentEditorField#ContentEditorField' } },
            },
            // Ground truth for the editor above — hidden here, edited only via
            // the custom toolbar/editor UI.
            { name: 'content', type: 'textarea', admin: { hidden: true } },
            {
              name: 'attachmentsPanel',
              type: 'ui',
              admin: { components: { Field: '/components/admin/campaigns/AttachmentsField#AttachmentsField' } },
            },
            // Ground truth for the panel above — hidden here. Each row is
            // either a Campaign Media doc (`media`) or an external link (`url`).
            {
              // A plain JSON field, not `array` — Payload's `array` field type
              // tracks rows via a separate row-indexed form-state shape
              // (`attachments.0.media`, `attachments.1.url`, ...), not a flat
              // array under `attachments.value`. AttachmentsField reads/writes
              // a literal array directly, which only `json` guarantees.
              name: 'attachments',
              type: 'json',
              defaultValue: [],
              admin: { hidden: true },
            },
          ],
        },
        {
          label: 'Attributes',
          admin: { condition: (data) => data?.campaignType !== 'drip' },
          fields: [
            {
              name: 'attributes',
              type: 'json',
              label: 'Attributes',
              defaultValue: {},
              admin: { description: 'Custom JSON object {} attributes for this campaign. Use in template with {{ .Campaign.Attribs.$key }}' },
            },
          ],
        },
        {
          label: 'Archive',
          admin: { condition: (data) => data?.campaignType !== 'drip' },
          fields: [
            {
              name: 'enablePublicArchive',
              type: 'checkbox',
              label: 'Publish to public archive',
              defaultValue: false,
              admin: { description: 'Publish (running, paused, finished) the campaign message on the public archive.' },
            },
            {
              name: 'archiveTemplate',
              type: 'relationship',
              relationTo: 'campaign-templates',
              label: 'Template',
              admin: { description: 'Layout used for the public archive page.', condition: (data) => Boolean(data?.enablePublicArchive) },
            },
            {
              name: 'archiveSlug',
              type: 'text',
              label: 'URL Slug',
              admin: {
                description: 'A short name for the page to be used in the public URL. eg: my-newsletter-edition-2',
                condition: (data) => Boolean(data?.enablePublicArchive),
              },
            },
            {
              name: 'archiveMeta',
              type: 'json',
              label: 'Campaign metadata',
              defaultValue: { name: 'Subscriber' },
              admin: {
                description: 'Dummy subscriber data to use in the public message including name, email, and any optional attributes used in the campaign message or template.',
                condition: (data) => Boolean(data?.enablePublicArchive),
              },
            },
          ],
        },
      ],
    },
    {
      name: 'sendCampaignPanel',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.campaignType !== 'drip',
        components: { Field: '/components/admin/campaigns/SendCampaignPanel#SendCampaignPanel' },
      },
    },
    {
      name: 'sendTestPanel',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.campaignType !== 'drip',
        components: { Field: '/components/admin/campaigns/SendTestMessagePanel#SendTestMessagePanel' },
      },
    },
    {
      name: 'dripControlPanel',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.campaignType === 'drip',
        components: { Field: '/components/admin/campaigns/DripControlPanel#DripControlPanel' },
      },
    },
    // status/stats are driven by the send pipeline (see SendCampaignPanel /
    // DripControlPanel + campaignSend.ts / automationSend.ts). For a drip
    // campaign, `status` means: draft (not yet activated) / running (actively
    // enrolling + sending steps) / paused.
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: ['draft', 'scheduled', 'running', 'paused', 'finished', 'cancelled'],
      admin: {
        hidden: true,
        components: { Cell: '/components/admin/campaigns/StatusCell#StatusCell' },
      },
    },
    { name: 'views', type: 'number', defaultValue: 0, admin: { readOnly: true, hidden: true } },
    { name: 'clicks', type: 'number', defaultValue: 0, admin: { readOnly: true, hidden: true } },
    { name: 'sentCount', type: 'number', defaultValue: 0, label: 'Sent', admin: { readOnly: true, hidden: true } },
    { name: 'totalRecipients', type: 'number', defaultValue: 0, admin: { readOnly: true, hidden: true } },
    { name: 'bounces', type: 'number', defaultValue: 0, admin: { readOnly: true, hidden: true } },
    { name: 'unsubscribes', type: 'number', defaultValue: 0, admin: { readOnly: true, hidden: true } },
    { name: 'totalEnrolled', type: 'number', defaultValue: 0, admin: { readOnly: true, hidden: true, description: 'Drip campaigns only — total contacts ever enrolled.' } },
    {
      // One-shot campaigns only. When a send is interrupted by the active
      // SMTP provider's daily limit, status flips to 'paused' with
      // pausedReason: 'daily_limit' and sentContactIds records who's
      // already been emailed this run, so the background resume check
      // (resumeDailyLimitPausedCampaigns) can pick up tomorrow without
      // re-sending to anyone.
      name: 'pausedReason',
      type: 'select',
      options: ['daily_limit', 'manual'],
      admin: { readOnly: true, hidden: true },
    },
    { name: 'sentContactIds', type: 'json', defaultValue: [], admin: { readOnly: true, hidden: true } },
    { name: 'startedAt', type: 'date', admin: { readOnly: true, hidden: true } },
    { name: 'endedAt', type: 'date', admin: { readOnly: true, hidden: true } },
  ],
}
