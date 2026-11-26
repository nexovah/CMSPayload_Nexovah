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
  yearly: '₹9,999 / 1 Year',
}

// Mirrors the Business Builder Plan checklist on the Design My Website page
// (pages_dmw_pricing_sections_rows) — static here rather than queried live,
// same tradeoff PLAN_LABELS already makes: if the plan's included features
// ever change, this list needs updating by hand to match.
const PLAN_FEATURES = [
  'Website (Up to 5 Pages)',
  'Domain, Hosting, SSL & CDN (1 Year)',
  'Logo Design',
  '1 Month Free Support',
  'AI WhatsApp Agent (3 Months Included)',
  'Booking & Leads Form',
  'Email Responder / Automation',
  'CRM',
  'UPI Payments',
  '3 Languages',
  'SEO, AEO & GEO Setup (1 Time)',
  'AI Search Visibility (llms.txt Setup)',
  'Google Business Profile Setup',
  'GA4 Analytics',
  'Social Integration (Facebook, Instagram, LinkedIn, YouTube)',
]

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

  // Two columns, alternating, email-client-safe (table-based, no flexbox).
  const featureRows: string[] = []
  for (let i = 0; i < PLAN_FEATURES.length; i += 2) {
    const left = PLAN_FEATURES[i]
    const right = PLAN_FEATURES[i + 1]
    featureRows.push(`
        <tr>
          <td style="width:50%; padding:6px 10px 6px 0; vertical-align:top; font-size:13px; color:#101010;">
            <span style="color:#00a84c; font-weight:700;">&#10003;</span>&nbsp; ${left}
          </td>
          <td style="width:50%; padding:6px 0 6px 10px; vertical-align:top; font-size:13px; color:#101010;">
            ${right ? `<span style="color:#00a84c; font-weight:700;">&#10003;</span>&nbsp; ${right}` : ''}
          </td>
        </tr>`)
  }
  const featuresListHtml = `
    <table role="presentation" width="100%" style="margin-top:12px; border-collapse:collapse;">
      ${featureRows.join('')}
    </table>`

  const tags: Record<string, string> = {
    customer_name: order.customerName,
    order_number: order.orderNumber,
    plan_label: planLabel,
    amount_paid: `₹${order.amount.toLocaleString('en-IN')}`,
    payment_id: order.razorpayPaymentId || '—',
    purchase_date: purchaseDate,
    expiry_date: expiryDate,
    validity_label: validityLabel,
    features_list: featuresListHtml,
  }

  const fill = (html: string) =>
    Object.entries(tags).reduce((acc, [key, value]) => acc.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), value), html)

  if (template?.rawHtml) return fill(template.rawHtml)

  // Built-in fallback layout — branded (Nexovah green/dark-green palette,
  // matching the Design My Website page), not the generic grey system-email
  // shell every other transactional email in this codebase still uses.
  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1">
    <style>
      body { background-color: #F0FBF2; font-family: 'Helvetica Neue', 'Segoe UI', Helvetica, sans-serif; font-size: 15px; line-height: 24px; margin: 0; color: #444; }
      .outer { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
      .header { background-color: #0B2A20; border-radius: 12px 12px 0 0; padding: 22px 28px; }
      .header .wordmark { color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.3px; }
      .header .accent { color: #00d45f; }
      .wrap { background-color: #fff; padding: 32px 28px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
      h1 { color: #101010; font-size: 21px; margin: 0 0 4px; }
      .subtext { color: #6b6b6b; font-size: 14px; margin: 0 0 20px; }
      table.details { width: 100%; border-collapse: collapse; }
      table.details td { padding: 9px 0; border-bottom: 1px solid #EDEDED; font-size: 14px; }
      td.label { color: #6b6b6b; width: 45%; }
      td.value { color: #101010; font-weight: 600; text-align: right; }
      .rule { margin-top: 20px; padding: 14px 16px; background: #DFFBEA; border-radius: 10px; font-size: 13.5px; color: #013F32; }
      .plan-box { margin-top: 28px; border: 1px solid #EDEDED; border-radius: 12px; padding: 18px 20px; background: #FAFFFB; }
      .plan-box h2 { margin: 0 0 4px; font-size: 16px; color: #101010; }
      .plan-box .plan-sub { margin: 0; font-size: 13px; color: #6b6b6b; }
      .footer { margin-top: 24px; text-align: center; color: #9A9A9A; font-size: 12px; }
      .footer a { color: #00a84c; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="outer">
      <div class="header">
        <span class="wordmark">nexovah<span class="accent">.</span></span>
      </div>
      <div class="wrap">
        <h1>Order Confirmed — Thank you, ${order.customerName}!</h1>
        <p class="subtext">Your payment was successful. Here are your order details:</p>
        <table class="details">
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

        <div class="plan-box">
          <h2>Your Business Builder Plan</h2>
          <p class="plan-sub">Everything included in your ${planLabel} plan:</p>
          ${featuresListHtml}
        </div>

        <p style="margin-top:24px; color:#6b6b6b; font-size:13px;">
          Questions about your order? Reply to this email or reach us on WhatsApp.
        </p>
      </div>
      <div class="footer">
        Nexovah Technology &middot; <a href="https://nexovah.com">nexovah.com</a>
      </div>
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
