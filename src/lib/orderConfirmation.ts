import type { Payload } from 'payload'
import { sendEmail } from './sendEmail'

type OrderLike = {
  orderNumber: string
  plan: 'monthly' | 'yearly'
  amount: number
  customerName: string
  customerEmail: string
  customerPhone: string
  razorpayPaymentId?: string | null
  purchaseDate?: string | null
  expiryDate?: string | null
  validityDays?: number | null
}

const PLAN_LABELS: Record<'monthly' | 'yearly', string> = {
  monthly: '₹399 / 1 Month',
  yearly: '₹4,999 / 1 Year',
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso))
}

async function findTemplateByName(payload: Payload, name: string) {
  const res = await payload.find({ collection: 'campaign-templates', where: { name: { equals: name } }, limit: 1 })
  return res.docs[0]
}

// Fills the order-specific merge tags into the "Order Confirmation Template"
// campaign-template. Falls back to a plain built-in layout if the admin
// hasn't created/renamed the template yet, so emails never silently fail to
// send just because the template row is missing.
function buildOrderHtml(order: OrderLike, template?: { rawHtml?: string | null }): string {
  const planLabel = PLAN_LABELS[order.plan]
  const purchaseDate = formatDate(order.purchaseDate)
  const expiryDate = formatDate(order.expiryDate)
  const validityLabel = order.validityDays === 365 ? '365 Days' : order.validityDays === 30 ? '30 Days' : `${order.validityDays ?? '—'} Days`

  const tags: Record<string, string> = {
    customer_name: order.customerName,
    order_number: order.orderNumber,
    plan_label: planLabel,
    amount_paid: `₹${order.amount.toLocaleString('en-IN')}`,
    payment_id: order.razorpayPaymentId || '—',
    purchase_date: purchaseDate,
    expiry_date: expiryDate,
    validity_label: validityLabel,
  }

  const fill = (html: string) =>
    Object.entries(tags).reduce((acc, [key, value]) => acc.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), value), html)

  if (template?.rawHtml) return fill(template.rawHtml)

  // Built-in fallback layout — same wrap/style convention as every other
  // system email in this codebase (see CampaignTemplates.ts's DEFAULT_HTML).
  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">
    <style>
      body { background-color: #F0F1F3; font-family: 'Helvetica Neue', 'Segoe UI', Helvetica, sans-serif; font-size: 15px; line-height: 26px; margin: 0; color: #444; }
      .wrap { background-color: #fff; padding: 30px; max-width: 525px; margin: 0 auto; border-radius: 5px; }
      h1 { color: #101010; font-size: 22px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      td { padding: 8px 0; border-bottom: 1px solid #EDEDED; }
      td.label { color: #6b6b6b; width: 45%; }
      td.value { color: #101010; font-weight: 600; }
      .rule { margin-top: 20px; padding: 14px; background: #F0FBF2; border-radius: 8px; font-size: 14px; color: #196d54; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Order Confirmed — Thank you, ${order.customerName}!</h1>
      <p>Your payment was successful. Here are your order details:</p>
      <table>
        <tr><td class="label">Order Number</td><td class="value">${order.orderNumber}</td></tr>
        <tr><td class="label">Plan Purchased</td><td class="value">${planLabel}</td></tr>
        <tr><td class="label">Amount Paid</td><td class="value">₹${order.amount.toLocaleString('en-IN')}</td></tr>
        <tr><td class="label">Payment ID</td><td class="value">${order.razorpayPaymentId || '—'}</td></tr>
        <tr><td class="label">Purchase Date</td><td class="value">${purchaseDate}</td></tr>
        <tr><td class="label">Validity Period</td><td class="value">${validityLabel}</td></tr>
        <tr><td class="label">Valid Until</td><td class="value">${expiryDate}</td></tr>
      </table>
      <div class="rule">
        Your website plan is active from <strong>${purchaseDate}</strong> through <strong>${expiryDate}</strong>.
        Renew before expiry to keep your website live without interruption.
      </div>
      <p style="margin-top:24px; color:#6b6b6b; font-size:13px;">
        Questions about your order? Reply to this email or reach us on WhatsApp.
      </p>
    </div>
  </body>
</html>`
}

export async function sendOrderConfirmationEmails(payload: Payload, order: OrderLike): Promise<void> {
  const template = await findTemplateByName(payload, 'Order Confirmation Template')
  const html = buildOrderHtml(order, template)
  const planLabel = PLAN_LABELS[order.plan]

  // Customer email
  await sendEmail(payload, {
    to: order.customerEmail,
    subject: `Order Confirmed — ${planLabel} — Nexovah Technology`,
    html,
  })

  // Admin notification — same details, sent to whatever is configured in
  // Email Settings → Admin Notification Emails. No-op (not an error) if
  // that field is empty, since it's optional/unconfigured by default.
  const appSettings = await payload.findGlobal({ slug: 'app-settings' })
  const adminEmails = (appSettings.adminNotificationEmails || '')
    .split(',')
    .map((e: string) => e.trim())
    .filter(Boolean)

  if (adminEmails.length > 0) {
    await sendEmail(payload, {
      to: adminEmails,
      subject: `[Order] ${order.orderNumber} — ${planLabel} — ${order.customerName}`,
      html,
    })
  }
}
