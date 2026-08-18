import type { CollectionAfterChangeHook } from 'payload'

const SENDABLE_LEAD_FIELDS = [
  'name',
  'email',
  'phone',
  'formType',
  'companyName',
  'website',
  'serviceCategory',
  'timelineDays',
  'budgetCurrency',
  'budget',
  'message',
  'sourcePage',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'createdAt',
] as const

// Fires a fire-and-forget POST to an n8n Webhook trigger whenever a Lead is
// created through a form configured in the N8N Settings global. Lets n8n
// workflows (WhatsApp alerts, Slack pings, ad-platform conversion syncs, etc)
// react to submissions in real time without n8n needing to poll Payload.
// Never awaited from the request path: a slow/unreachable n8n instance must
// never delay or break the visitor's form submission response.
export const forwardLeadToN8n: CollectionAfterChangeHook = ({ doc, operation, req }) => {
  if (operation !== 'create') return doc

  void req.payload
    .findGlobal({ slug: 'n8n-settings', depth: 0 })
    .then((settings) => {
      const webhooks = (settings.n8nWebhooks ?? []) as {
        enabled?: boolean
        formType?: string
        webhookUrl?: string
        fieldsToSend?: string[]
      }[]
      const match = webhooks.find((w) => w.enabled !== false && w.formType === doc.formType && w.webhookUrl)
      if (!match?.webhookUrl) return

      // Admin's checked-field selection controls the payload shape — the Lead
      // ID always rides along for traceability even if every box is unchecked.
      const selected = match.fieldsToSend && match.fieldsToSend.length > 0 ? match.fieldsToSend : SENDABLE_LEAD_FIELDS
      const body: Record<string, unknown> = { id: doc.id }
      for (const field of selected) {
        if (SENDABLE_LEAD_FIELDS.includes(field as (typeof SENDABLE_LEAD_FIELDS)[number])) {
          body[field] = doc[field]
        }
      }

      return fetch(match.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then((res) => {
        if (!res.ok) throw new Error(`n8n webhook responded ${res.status}`)
        req.payload.logger.info(`Lead ${doc.id} forwarded to n8n (${doc.formType}).`)
      })
    })
    .catch((err) => req.payload.logger.error(`n8n webhook forward failed for lead ${doc.id}: ${err instanceof Error ? err.message : err}`))

  return doc
}
