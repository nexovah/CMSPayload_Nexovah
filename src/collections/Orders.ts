import type { CollectionConfig } from 'payload'
import Razorpay from 'razorpay'

// Razorpay checkout orders from the Design My Website payment step — a
// dedicated "Order" record (separate from Leads) that only ever exists once
// a customer reaches checkout, and only ever gets marked `paid` after the
// backend has verified Razorpay's signature server-side. A Lead can exist
// with zero, one, or more Orders — every form-fill is a Lead (as before);
// only completed checkouts also become an Order.
export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'status', 'plan', 'amount', 'customerName', 'customerPhone', 'expiryDate', 'createdAt'],
    group: 'Sales',
    description: 'Only status may be changed here (to Cancelled or Refunded) — every other field is set automatically by the payment flow and is not meant to be hand-edited. Cancelling/Refunding is synced to Razorpay — see the beforeChange hook.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    // Created only by the create-order/verify-payment server endpoints
    // (via the Payload local API, which bypasses `access` entirely) — never
    // directly from the browser.
    create: () => false,
    // Admins can update — restricted in practice to `status` transitions by
    // the beforeChange hook below (which rejects any other field change).
    update: ({ req }) => Boolean(req.user),
    // No delete — a bad/unpaid order gets Cancelled, not removed, so the
    // record (and the audit trail) always stays.
    delete: () => false,
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      required: true,
      unique: true,
      admin: { readOnly: true, description: 'Our own platform order id, e.g. NXV-20260902-0001 — distinct from Razorpay\'s own order id below.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'created',
      options: [
        { label: 'Created (awaiting payment)', value: 'created' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Refunded', value: 'refunded' },
      ],
      admin: {
        description: 'To cancel an unpaid order, or refund a paid one: change this to Cancelled / Refunded and save. Refunding calls Razorpay automatically — the save is rejected if Razorpay refuses the refund.',
        components: {
          // Edit view: the select is replaced with a confirm-code-modal gate
          // (client-side friction only — Orders.ts's beforeChange hook below
          // is the actual server-side enforcement, unaffected by this).
          Field: '/components/admin/orders/StatusConfirmField#StatusConfirmField',
          // List view: a colored badge instead of the plain option label.
          Cell: '/components/admin/orders/OrderStatusCell#OrderStatusCell',
        },
      },
    },
    {
      name: 'plan',
      type: 'select',
      required: true,
      admin: { readOnly: true },
      options: [
        { label: '₹399 / 1 Month', value: 'monthly' },
        { label: '₹4,999 / 1 Year', value: 'yearly' },
      ],
    },
    { name: 'amount', type: 'number', required: true, admin: { readOnly: true, description: 'Amount charged, in ₹ (rupees, not paise).' } },
    { name: 'customerName', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'customerEmail', type: 'email', required: true, admin: { readOnly: true } },
    { name: 'customerPhone', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'razorpayOrderId', type: 'text', required: true, unique: true, admin: { readOnly: true } },
    { name: 'razorpayPaymentId', type: 'text', admin: { readOnly: true, description: 'Populated once payment succeeds.' } },
    { name: 'razorpaySignature', type: 'text', admin: { readOnly: true, description: 'Stored for audit trail after verification.' } },
    { name: 'razorpayRefundId', type: 'text', admin: { readOnly: true, description: 'Populated once a refund is processed.' } },
    {
      name: 'purchaseDate',
      type: 'date',
      admin: { readOnly: true, description: 'Set the moment payment is verified — the plan\'s validity starts from here.' },
    },
    {
      name: 'validityDays',
      type: 'number',
      admin: { readOnly: true, description: '30 for Monthly, 365 for Yearly — set automatically from plan.' },
    },
    {
      name: 'expiryDate',
      type: 'date',
      admin: { readOnly: true, description: 'purchaseDate + validityDays, computed automatically.' },
    },
    { name: 'lead', type: 'relationship', relationTo: 'leads', admin: { readOnly: true, description: 'The Lead this checkout belongs to.' } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req, operation, context }) => {
        if (operation !== 'update' || !originalDoc) return data

        // /api/verify-payment (created -> paid/failed) writes with this
        // context flag set — those are the payment flow's own internal
        // transitions and skip the admin-only cancel/refund validation
        // below entirely.
        if (context?.internalPaymentFlow) return data

        // Only a status transition is ever allowed through the admin UI —
        // every other field on an existing Order is set by the payment
        // flow itself and must not be hand-edited afterward.
        const attemptedStatus = data.status
        if (attemptedStatus === originalDoc.status) return data

        if (attemptedStatus === 'cancelled') {
          if (originalDoc.status !== 'created' && originalDoc.status !== 'failed') {
            throw new Error('Only an unpaid order (Created or Failed) can be Cancelled. Use Refunded for a paid order.')
          }
          return { ...originalDoc, status: 'cancelled' }
        }

        if (attemptedStatus === 'refunded') {
          if (originalDoc.status !== 'paid') {
            throw new Error('Only a Paid order can be Refunded.')
          }
          if (!originalDoc.razorpayPaymentId) {
            throw new Error('No Razorpay payment id on this order — cannot refund.')
          }

          const key_id = process.env.RAZORPAY_KEY_ID
          const key_secret = process.env.RAZORPAY_KEY_SECRET
          if (!key_id || !key_secret) {
            throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not configured — cannot process refund.')
          }

          try {
            const client = new Razorpay({ key_id, key_secret })
            const refund = await client.payments.refund(originalDoc.razorpayPaymentId, {})
            req.payload.logger.info(`Order ${originalDoc.orderNumber} refunded via Razorpay (refund ${refund.id}).`)
            return { ...originalDoc, status: 'refunded', razorpayRefundId: refund.id }
          } catch (err) {
            req.payload.logger.error(`Razorpay refund failed for order ${originalDoc.orderNumber}: ${err instanceof Error ? err.message : err}`)
            throw new Error(`Razorpay refused the refund: ${err instanceof Error ? err.message : 'unknown error'}`)
          }
        }

        // Any other attempted status change from the admin UI (e.g. back to
        // "paid") is rejected — those transitions only ever happen from the
        // server-side payment flow itself.
        throw new Error(`Status cannot be changed from "${originalDoc.status}" to "${attemptedStatus}" here.`)
      },
    ],
  },
}
