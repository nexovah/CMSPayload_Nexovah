import type { CollectionAfterChangeHook } from 'payload'
import crypto from 'crypto'

// Server-side mirror of the browser's fbq('track', 'Lead') call on the
// Design My Website form (see DesignMyWebsitePage.tsx) — sent via Meta's
// Conversions API so the Lead event still reaches Meta even when an ad
// blocker or Safari's tracking prevention drops the client-side pixel call.
// Shares the same event_id as the browser call (Leads.metaEventId, set by
// the frontend at submit time) so Meta's dedup treats both as one event.
//
// Scope: Design My Website only, per the current setup — not Contact or
// Get a Quote.
function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export const sendMetaLeadCapiEvent: CollectionAfterChangeHook = ({ doc, operation, req }) => {
  if (operation !== 'create' || doc.formType !== 'design-my-website') return doc

  void req.payload
    .findGlobal({ slug: 'site-settings', depth: 0 })
    .then((settings) => {
      const pixelId = settings.metaPixelId as string | undefined
      const accessToken = settings.metaCapiAccessToken as string | undefined
      if (!pixelId || !accessToken) return // not configured — silently skip, same as every other optional integration in this app

      const testEventCode = settings.metaCapiTestEventCode as string | undefined
      const userAgent = req.headers?.get?.('user-agent') || undefined
      const forwardedFor = req.headers?.get?.('x-forwarded-for') || undefined
      const clientIp = forwardedFor?.split(',')[0]?.trim()

      const eventUrl = doc.sourcePage
        ? `https://nexovah.com${doc.sourcePage.startsWith('/') ? '' : '/'}${doc.sourcePage}`
        : 'https://nexovah.com/design-my-website'

      const body = {
        data: [
          {
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            event_id: doc.metaEventId || `lead-${doc.id}`, // falls back to a stable id if the browser call didn't happen (JS blocked etc) — still a valid, non-duplicating event
            event_source_url: eventUrl,
            action_source: 'website',
            user_data: {
              em: [sha256(doc.email)],
              ...(doc.phone ? { ph: [sha256(doc.phone.replace(/[^0-9]/g, ''))] } : {}),
              ...(clientIp ? { client_ip_address: clientIp } : {}),
              ...(userAgent ? { client_user_agent: userAgent } : {}),
            },
          },
        ],
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
      }

      return fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(async (res) => {
        if (!res.ok) throw new Error(`Meta CAPI responded ${res.status}: ${await res.text()}`)
        req.payload.logger.info(`Meta CAPI Lead event sent for lead ${doc.id}.`)
      })
    })
    .catch((err) => req.payload.logger.error(`Meta CAPI Lead event failed for lead ${doc.id}: ${err instanceof Error ? err.message : err}`))

  return doc
}
