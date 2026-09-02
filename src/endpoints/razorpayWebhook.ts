import type { Endpoint } from 'payload'
import crypto from 'crypto'
import { sendOrderConfirmationEmails } from '../lib/orderConfirmation'
import { getRazorpayCredentials } from '../lib/razorpayCredentials'

const PLAN_VALIDITY_DAYS: Record<string, number> = { monthly: 30, yearly: 365 }

function generateOrderNumber(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `NXV-${y}${m}${d}-${rand}`
}

// POST /api/razorpay-webhook
// Registered in your Razorpay Dashboard -> Settings -> Webhooks, pointed at
// this URL, with the "payment_link.paid" event checked. Requires
// the Webhook Secret set in Sales -> Payment Gateway (whichever mode —
// Test/Live — is currently active there), or every request is rejected.
//
// This is how a customer paying via a custom Payment Link (sent from a
// Customer's "Send Payment Link" action) gets automatically reconciled —
// unlike Standard Checkout, there's no client-side redirect back to our
// page to call /api/verify-payment from, so Razorpay notifies us here
// instead once the link is actually paid.
export const razorpayWebhookEndpoint: Endpoint = {
  path: '/razorpay-webhook',
  method: 'post',
  handler: async (req) => {
    const creds = await getRazorpayCredentials(req.payload)
    const webhookSecret = creds?.webhook_secret
    if (!webhookSecret) {
      req.payload.logger.error('razorpay-webhook: Webhook Secret not configured in Sales → Payment Gateway — rejecting.')
      return Response.json({ error: 'Webhook not configured.' }, { status: 500 })
    }

    const rawBody = await req.text?.()
    const signature = req.headers.get('x-razorpay-signature')
    if (!rawBody || !signature) {
      return Response.json({ error: 'Missing body or signature.' }, { status: 400 })
    }

    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex')
    if (expected !== signature) {
      req.payload.logger.error('razorpay-webhook: signature mismatch — rejecting.')
      return Response.json({ error: 'Signature mismatch.' }, { status: 400 })
    }

    const body = JSON.parse(rawBody) as {
      event?: string
      payload?: { payment_link?: { entity?: { id?: string; status?: string } }; payment?: { entity?: { id?: string } } }
    }

    if (body.event !== 'payment_link.paid') {
      // Any other subscribed event — acknowledge and ignore, nothing else
      // is wired to this webhook yet.
      return Response.json({ received: true })
    }

    const paymentLinkId = body.payload?.payment_link?.entity?.id
    const paymentId = body.payload?.payment?.entity?.id
    if (!paymentLinkId) {
      return Response.json({ error: 'Missing payment_link id in webhook payload.' }, { status: 400 })
    }

    const { docs } = await req.payload.find({
      collection: 'customers',
      where: { paymentLinkId: { equals: paymentLinkId } },
      limit: 1,
    })
    const customer = docs[0]
    if (!customer) {
      req.payload.logger.error(`razorpay-webhook: no Customer found for payment_link ${paymentLinkId}.`)
      return Response.json({ received: true }) // ack anyway — Razorpay retries on non-2xx
    }

    if (customer.paymentLinkStatus === 'paid') {
      return Response.json({ received: true }) // already processed — webhook retries are expected, stay idempotent
    }

    const pkg = typeof customer.package === 'object' ? customer.package : await req.payload.findByID({ collection: 'products', id: customer.package })
    const purchaseDate = new Date()
    const validityDays = PLAN_VALIDITY_DAYS[pkg?.planKey || ''] ?? 30
    const expiryDate = new Date(purchaseDate.getTime() + validityDays * 24 * 60 * 60 * 1000)
    const orderNumber = generateOrderNumber()

    const order = await req.payload.create({
      collection: 'orders',
      data: {
        orderNumber,
        status: 'paid',
        plan: (pkg?.planKey as 'monthly' | 'yearly') || 'monthly',
        amount: pkg?.price || 0,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        razorpayOrderId: paymentLinkId, // Payment Links don't produce a separate order_id — the link id is the closest equivalent
        razorpayPaymentId: paymentId,
        purchaseDate: purchaseDate.toISOString(),
        validityDays,
        expiryDate: expiryDate.toISOString(),
      },
      context: { internalPaymentFlow: true },
    })

    await req.payload.update({
      collection: 'customers',
      id: customer.id,
      data: {
        paymentLinkStatus: 'paid',
        purchaseDate: purchaseDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        order: order.id,
        remindersSent: [], // fresh validity period — resets so the 7d/3d/0d reminders can fire again for this new cycle
      },
      context: { internalPaymentFlow: true },
    })

    void sendOrderConfirmationEmails(req.payload, order)
      .then(() => req.payload.logger.info(`Payment-link order confirmation emails sent for ${order.orderNumber}.`))
      .catch((err) => req.payload.logger.error(`Payment-link confirmation email failed for ${order.orderNumber}: ${err instanceof Error ? err.message : err}`))

    req.payload.logger.info(`Payment link ${paymentLinkId} paid — created order ${order.orderNumber} for customer ${customer.email}.`)
    return Response.json({ received: true })
  },
}
