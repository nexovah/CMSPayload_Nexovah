import type { Endpoint } from 'payload'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { sendOrderConfirmationEmails } from '../lib/orderConfirmation'
import { getRazorpayCredentials } from '../lib/razorpayCredentials'

// Design My Website's Step 3 payment — two fixed plans. The amount is
// decided here, server-side — never trusted from the browser. Prices come
// from the Products collection (admin-editable) when present, falling back
// to these defaults if that row is ever missing/misconfigured.
const PLAN_FALLBACK_AMOUNTS_PAISE: Record<string, number> = {
  monthly: 399 * 100,
  yearly: 4999 * 100,
}
const PLAN_VALIDITY_DAYS: Record<string, number> = {
  monthly: 30,
  yearly: 365,
}

async function resolvePlan(
  req: Parameters<Endpoint['handler']>[0],
  plan: string,
): Promise<{ amountPaise: number; status: 'active' | 'inactive' | 'unknown' }> {
  try {
    const { docs } = await req.payload.find({
      collection: 'products',
      where: { planKey: { equals: plan } },
      limit: 1,
    })
    const product = docs[0]
    if (product && typeof product.price === 'number' && product.price > 0) {
      return { amountPaise: Math.round(product.price * 100), status: product.status as 'active' | 'inactive' }
    }
  } catch {
    // fall through to the hardcoded default below
  }
  return { amountPaise: PLAN_FALLBACK_AMOUNTS_PAISE[plan], status: 'unknown' }
}

async function razorpayClient(payload: Parameters<Endpoint['handler']>[0]['payload']) {
  const creds = await getRazorpayCredentials(payload)
  if (!creds) throw new Error('Razorpay credentials not configured — set them in Sales → Payment Gateway.')
  return { client: new Razorpay({ key_id: creds.key_id, key_secret: creds.key_secret }), creds }
}

function generateOrderNumber(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `NXV-${y}${m}${d}-${rand}`
}

// POST /api/create-order
// Body: { plan: 'monthly' | 'yearly', name, email, phone, leadId? }
export const createOrderEndpoint: Endpoint = {
  path: '/create-order',
  method: 'post',
  handler: async (req) => {
    const body = (req.json ? await req.json() : {}) as {
      plan?: string
      name?: string
      email?: string
      phone?: string
      leadId?: number | string
    }
    const { plan, name, email, phone, leadId } = body

    if (!plan || !(plan in PLAN_FALLBACK_AMOUNTS_PAISE)) {
      return Response.json({ error: 'Invalid or missing plan. Must be "monthly" or "yearly".' }, { status: 400 })
    }
    if (!name || !email || !phone) {
      return Response.json({ error: 'name, email, and phone are required.' }, { status: 400 })
    }

    const { amountPaise, status } = await resolvePlan(req, plan)
    if (status === 'inactive') {
      // Defense in depth beyond the frontend hiding the tab — the public
      // Step 3 checkout must never let an Inactive plan through even via a
      // direct API call. (The future custom-payment-link flow for Inactive
      // plans uses a separate path, not this public endpoint.)
      return Response.json({ error: 'This plan is not currently available for purchase.' }, { status: 400 })
    }
    if (amountPaise < 100) {
      return Response.json({ error: 'Amount below Razorpay minimum (100 paise).' }, { status: 400 })
    }

    const orderNumber = generateOrderNumber()

    try {
      const { client } = await razorpayClient(req.payload)
      const razorpayOrder = await client.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: orderNumber,
      })

      await req.payload.create({
        collection: 'orders',
        data: {
          orderNumber,
          status: 'created',
          plan: plan as 'monthly' | 'yearly',
          amount: amountPaise / 100,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          razorpayOrderId: razorpayOrder.id,
          lead: leadId != null ? Number(leadId) : undefined,
        },
      })

      return Response.json({
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_number: orderNumber,
      })
    } catch (err) {
      req.payload.logger.error(`Razorpay create-order failed: ${err instanceof Error ? err.message : err}`)
      const message = err instanceof Error ? err.message : 'Unknown error'
      const isAuthError = message.toLowerCase().includes('authentication') || message.toLowerCase().includes('key')
      return Response.json({ error: 'Could not create payment order.' }, { status: isAuthError ? 401 : 500 })
    }
  },
}

// POST /api/verify-payment
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export const verifyPaymentEndpoint: Endpoint = {
  path: '/verify-payment',
  method: 'post',
  handler: async (req) => {
    const body = (req.json ? await req.json() : {}) as {
      razorpay_order_id?: string
      razorpay_payment_id?: string
      razorpay_signature?: string
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json({ error: 'Missing razorpay_order_id, razorpay_payment_id, or razorpay_signature.' }, { status: 400 })
    }

    const creds = await getRazorpayCredentials(req.payload)
    if (!creds) {
      req.payload.logger.error('verify-payment: Razorpay credentials not configured — set them in Sales → Payment Gateway.')
      return Response.json({ error: 'Payment verification not configured.' }, { status: 500 })
    }

    const expectedSignature = crypto
      .createHmac('sha256', creds.key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    const signaturesMatch = expectedSignature === razorpay_signature

    const { docs } = await req.payload.find({
      collection: 'orders',
      where: { razorpayOrderId: { equals: razorpay_order_id } },
      limit: 1,
    })
    const orderDoc = docs[0]

    if (!signaturesMatch) {
      if (orderDoc) {
        await req.payload.update({
          collection: 'orders',
          id: orderDoc.id,
          data: { status: 'failed' },
          context: { internalPaymentFlow: true },
        })
      }
      return Response.json({ success: false, error: 'Signature mismatch.' }, { status: 400 })
    }

    if (!orderDoc) {
      // Signature is valid but we have no matching order row — shouldn't
      // happen in normal flow, but never claim success without a record.
      return Response.json({ success: false, error: 'Order not found.' }, { status: 400 })
    }

    // Validity starts from the actual moment payment is confirmed, not
    // order-creation time.
    const purchaseDate = new Date()
    const validityDays = PLAN_VALIDITY_DAYS[orderDoc.plan] ?? 30
    const expiryDate = new Date(purchaseDate.getTime() + validityDays * 24 * 60 * 60 * 1000)

    const updated = await req.payload.update({
      collection: 'orders',
      id: orderDoc.id,
      data: {
        status: 'paid',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        purchaseDate: purchaseDate.toISOString(),
        validityDays,
        expiryDate: expiryDate.toISOString(),
      },
      context: { internalPaymentFlow: true },
    })

    // Auto-create the Customer record for this paid order — mirrors the
    // Order's dates/plan. Awaited (not fire-and-forget) since the Customer
    // row must exist before the confirmation emails' logic runs, but this
    // is a fast local-DB write, not a network call, so it doesn't meaningfully
    // delay the response.
    try {
      const existingCustomer = await req.payload.find({
        collection: 'customers',
        where: { order: { equals: updated.id } },
        limit: 1,
      })
      if (existingCustomer.docs.length === 0) {
        const { docs: productDocs } = await req.payload.find({
          collection: 'products',
          where: { planKey: { equals: updated.plan } },
          limit: 1,
        })
        await req.payload.create({
          collection: 'customers',
          data: {
            name: updated.customerName,
            email: updated.customerEmail,
            phone: updated.customerPhone,
            package: productDocs[0]?.id,
            purchaseDate: purchaseDate.toISOString(),
            expiryDate: expiryDate.toISOString(),
            source: 'checkout',
            order: updated.id,
          },
        })
      }
    } catch (err) {
      req.payload.logger.error(`Customer auto-create failed for order ${updated.orderNumber}: ${err instanceof Error ? err.message : err}`)
    }

    // Fire-and-forget — a slow/failing SMTP send must never delay or break
    // the customer's payment-success response, same pattern as every other
    // post-create email hook in this codebase (sendLeadAutoReply etc).
    void sendOrderConfirmationEmails(req.payload, updated)
      .then(() => req.payload.logger.info(`Order confirmation emails sent for ${updated.orderNumber}.`))
      .catch((err) =>
        req.payload.logger.error(`Order confirmation email failed for ${updated.orderNumber}: ${err instanceof Error ? err.message : err}`),
      )

    return Response.json({
      success: true,
      order_number: updated.orderNumber,
      plan: updated.plan,
      amount: updated.amount,
    })
  },
}
