import type { CollectionAfterChangeHook } from 'payload'
import crypto from 'crypto'

// Server-side Purchase event for Orders, sent via Meta's Conversions API.
// Needed because most payments on Design My Website happen through the
// Razorpay Payment Link / WhatsApp flow (razorpayWebhook.ts), where the
// customer's browser never comes back to this site to fire a client-side
// fbq('track', 'Purchase') call — without this hook, those purchases would
// never reach Meta at all.
//
// event_id is `purchase-<orderNumber>` — generated here and also used by
// the frontend's client-side trackPurchase() call (for the in-browser
// verify-payment flow), so Meta dedupes both into a single Purchase event
// when both fire for the same order.
function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export const sendMetaPurchaseCapiEvent: CollectionAfterChangeHook = ({ doc, previousDoc, operation, req }) => {
  const justPaid = doc.status === 'paid' && (operation === 'create' || previousDoc?.status !== 'paid')
  if (!justPaid) return doc

  void req.payload
    .findGlobal({ slug: 'site-settings', depth: 0 })
    .then(async (settings) => {
      const pixelId = settings.metaPixelId as string | undefined
      const accessToken = settings.metaCapiAccessToken as string | undefined
      if (!pixelId || !accessToken) return // not configured — silently skip, same as every other optional integration in this app

      const testEventCode = settings.metaCapiTestEventCode as string | undefined
      const userAgent = req.headers?.get?.('user-agent') || undefined
      const forwardedFor = req.headers?.get?.('x-forwarded-for') || undefined
      const clientIp = forwardedFor?.split(',')[0]?.trim()

      // The selected industry chip is stored on the Lead's `message` field
      // (see DesignMyWebsitePage.tsx handleStep2Submit) — carried through
      // to this Purchase event as custom_data.industry per the tracking plan.
      let industry: string | undefined
      let sourcePage: string | undefined
      if (doc.lead) {
        try {
          const leadId = typeof doc.lead === 'object' ? doc.lead.id : doc.lead
          const lead = await req.payload.findByID({ collection: 'leads', id: leadId, depth: 0 })
          industry = lead?.message || undefined
          sourcePage = lead?.sourcePage || undefined
        } catch {
          // lead lookup is best-effort — a missing/deleted lead must never block the Purchase event
        }
      }

      const eventUrl = sourcePage
        ? `https://nexovah.com${sourcePage.startsWith('/') ? '' : '/'}${sourcePage}`
        : 'https://nexovah.com/build-my-business'

      // Standard Checkout (create-order/verify-payment) ids start "order_"
      // and the browser is present for the redirect back here; Payment
      // Link ids (razorpayWebhook.ts) start "plink_" and have no browser
      // round-trip at all.
      const actionSource = doc.razorpayOrderId?.startsWith('order_') ? 'website' : 'system_generated'

      const body = {
        data: [
          {
            event_name: 'Purchase',
            event_time: Math.floor(Date.now() / 1000),
            event_id: `purchase-${doc.orderNumber}`,
            event_source_url: eventUrl,
            action_source: actionSource,
            user_data: {
              ...(doc.customerEmail ? { em: [sha256(doc.customerEmail)] } : {}),
              ...(doc.customerPhone ? { ph: [sha256(doc.customerPhone.replace(/[^0-9]/g, ''))] } : {}),
              ...(clientIp ? { client_ip_address: clientIp } : {}),
              ...(userAgent ? { client_user_agent: userAgent } : {}),
            },
            custom_data: {
              value: doc.amount,
              currency: 'INR',
              content_name: 'Website + AI Agent Plan',
              ...(industry ? { industry } : {}),
            },
          },
        ],
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
      }

      return fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    })
    .then((res) => {
      if (res && !res.ok) {
        return res
          .text()
          .then((text) => req.payload.logger.error(`Meta Purchase CAPI failed for order ${doc.orderNumber}: ${text}`))
      }
      if (res) req.payload.logger.info(`Meta Purchase CAPI event sent for order ${doc.orderNumber}.`)
    })
    .catch((err) => req.payload.logger.error(`Meta Purchase CAPI error for order ${doc.orderNumber}: ${err instanceof Error ? err.message : err}`))

  return doc
}
