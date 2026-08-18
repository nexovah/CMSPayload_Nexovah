import type { CollectionAfterChangeHook } from 'payload'

// Fires a fire-and-forget POST to an n8n Webhook trigger whenever a Lead is
// created through a form configured in Email Settings → N8N. Lets n8n
// workflows (WhatsApp alerts, Slack pings, ad-platform conversion syncs, etc)
// react to submissions in real time without n8n needing to poll Payload.
// Never awaited from the request path: a slow/unreachable n8n instance must
// never delay or break the visitor's form submission response.
export const forwardLeadToN8n: CollectionAfterChangeHook = ({ doc, operation, req }) => {
  if (operation !== 'create') return doc

  void req.payload
    .findGlobal({ slug: 'app-settings', depth: 0 })
    .then((settings) => {
      const webhooks = (settings.n8nWebhooks ?? []) as { enabled?: boolean; formType?: string; webhookUrl?: string }[]
      const match = webhooks.find((w) => w.enabled !== false && w.formType === doc.formType && w.webhookUrl)
      if (!match?.webhookUrl) return

      return fetch(match.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: doc.id,
          name: doc.name,
          email: doc.email,
          phone: doc.phone,
          formType: doc.formType,
          companyName: doc.companyName,
          message: doc.message,
          sourcePage: doc.sourcePage,
          createdAt: doc.createdAt,
        }),
      }).then((res) => {
        if (!res.ok) throw new Error(`n8n webhook responded ${res.status}`)
        req.payload.logger.info(`Lead ${doc.id} forwarded to n8n (${doc.formType}).`)
      })
    })
    .catch((err) => req.payload.logger.error(`n8n webhook forward failed for lead ${doc.id}: ${err instanceof Error ? err.message : err}`))

  return doc
}
