import type { Payload } from 'payload'

export type RazorpayCredentials = {
  key_id: string
  key_secret: string
  webhook_secret: string
  mode: 'test' | 'live'
}

// Every Razorpay call in the app (create-order, verify-payment, refunds,
// renewal Payment Links, webhook signature verification) goes through this
// one function instead of reading env vars directly — the Payment Gateway
// global (Sales → Payment Gateway) is now the single source of truth, and
// its `liveMode` switch decides which credential set gets used everywhere,
// all at once, with no code/env changes needed to flip modes.
export async function getRazorpayCredentials(payload: Payload): Promise<RazorpayCredentials | null> {
  const settings = await payload.findGlobal({ slug: 'payment-gateway' })
  const live = Boolean(settings.liveMode)
  const creds = live ? settings.liveModeCredentials : settings.testMode

  const key_id = creds?.keyId
  const key_secret = creds?.keySecret
  const webhook_secret = creds?.webhookSecret

  if (!key_id || !key_secret) return null

  return { key_id, key_secret, webhook_secret: webhook_secret || '', mode: live ? 'live' : 'test' }
}
