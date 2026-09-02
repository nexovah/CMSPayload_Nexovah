import type { GlobalConfig } from 'payload'

// Single source of truth for Razorpay credentials — replaces the old
// RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET env vars.
// `liveMode` is the one switch: off = every payment call (create-order,
// verify-payment, refunds, renewal Payment Links, webhook signature check)
// uses the Test Mode credentials below; on = it uses Live Mode. Admin-only
// read/update — these are secrets, never exposed to the public API.
export const PaymentGateway: GlobalConfig = {
  slug: 'payment-gateway',
  label: 'Payment Gateway',
  admin: {
    description:
      'Razorpay credentials for the Design My Website checkout. Flip "Live Mode" on only once you\'ve tested with the Test Mode credentials below — while off, every payment (checkout, refunds, renewal links, webhook) uses Test Mode, no matter what\'s filled into Live Mode.',
    group: 'Sales',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'liveMode',
      type: 'checkbox',
      label: 'Live Mode',
      defaultValue: false,
      admin: {
        description: 'Off = Test Mode credentials are used everywhere. On = Live Mode credentials are used everywhere. Real money only moves when this is on.',
      },
    },
    {
      name: 'testMode',
      type: 'group',
      label: 'Test Mode Credentials',
      admin: { description: 'From Razorpay Dashboard → toggle to Test Mode → Settings → API Keys.' },
      fields: [
        { name: 'keyId', type: 'text', label: 'Key ID' },
        { name: 'keySecret', type: 'text', label: 'Key Secret' },
        {
          name: 'webhookSecret',
          type: 'text',
          label: 'Webhook Secret',
          admin: { description: 'From Razorpay Dashboard (Test Mode) → Settings → Webhooks → your webhook pointing at /api/razorpay-webhook.' },
        },
      ],
    },
    {
      name: 'liveModeCredentials',
      type: 'group',
      label: 'Live Mode Credentials',
      admin: { description: 'From Razorpay Dashboard → toggle to Live Mode → Settings → API Keys.' },
      fields: [
        { name: 'keyId', type: 'text', label: 'Key ID' },
        { name: 'keySecret', type: 'text', label: 'Key Secret' },
        {
          name: 'webhookSecret',
          type: 'text',
          label: 'Webhook Secret',
          admin: { description: 'From Razorpay Dashboard (Live Mode) → Settings → Webhooks → your webhook pointing at /api/razorpay-webhook.' },
        },
      ],
    },
  ],
}
