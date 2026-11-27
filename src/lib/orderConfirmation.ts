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

// Same number as Design My Website's dmwWhatsappNumber (digits only, no +)
// — kept as a constant here since this email sends from the backend, with
// no access to that page's own CMS content fetch.
const WHATSAPP_NUMBER = '918100388080'

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

  const amountPaid = `₹${order.amount.toLocaleString('en-IN')}`
  const paymentId = order.razorpayPaymentId || '—'

  // Pre-filled with exactly the fields the customer sees above — enough for
  // support to identify the order instantly on WhatsApp without asking.
  const whatsappMessage = [
    `Hi, I just completed my order.`,
    `Name: ${order.customerName}`,
    `Order Number: ${order.orderNumber}`,
    `Plan: ${planLabel}`,
    `Amount Paid: ${amountPaid}`,
    `Payment ID: ${paymentId}`,
    `Purchase Date: ${purchaseDate}`,
  ].join('\n')
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`

  // Table-based button (not a flex/gradient-dependent <button>) so it
  // renders consistently across email clients — Outlook/Gmail strip most
  // CSS, but a solid bgcolor on a <table>/<a> always survives.
  const whatsappButtonHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px; width:100%;">
      <tr>
        <td align="center" bgcolor="#00a84c" style="border-radius:10px;">
          <a href="${whatsappUrl}" target="_blank" style="display:block; padding:13px 16px; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; white-space:nowrap; font-family:'Helvetica Neue','Segoe UI',Helvetica,sans-serif;">
            <span style="display:inline-block; vertical-align:middle; margin-right:6px; width:16px; height:16px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" xmlns="http://www.w3.org/2000/svg"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.74.46 3.43 1.32 4.92L2.05 22l5.3-1.39a9.9 9.9 0 0 0 4.69 1.19h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.21 0 4.29.86 5.85 2.42a8.23 8.23 0 0 1 2.43 5.82c0 4.55-3.71 8.25-8.27 8.25a8.3 8.3 0 0 1-4.21-1.15l-.3-.18-3.15.83.84-3.07-.2-.32a8.19 8.19 0 0 1-1.26-4.37c0-4.55 3.71-8.23 8.27-8.23Zm-4.3 4.59c-.17 0-.44.06-.67.32-.23.26-.88.86-.88 2.09 0 1.23.9 2.42 1.03 2.59.13.17 1.76 2.8 4.33 3.82 2.14.85 2.58.68 3.04.64.47-.04 1.5-.61 1.71-1.2.21-.59.21-1.1.15-1.2-.06-.11-.23-.17-.47-.3-.25-.13-1.5-.74-1.73-.83-.23-.09-.4-.13-.57.13-.17.26-.65.83-.8 1-.15.17-.3.19-.55.06-.25-.13-1.07-.4-2.03-1.26-.75-.67-1.26-1.5-1.4-1.75-.15-.26-.02-.4.11-.52.11-.11.25-.3.38-.44.13-.15.17-.26.26-.43.08-.17.04-.32-.02-.45-.06-.13-.57-1.38-.78-1.9-.21-.5-.42-.43-.57-.44h-.49Z"/></svg>
            </span>
            Continue to Chat on WhatsApp
          </a>
        </td>
      </tr>
    </table>`

  const tags: Record<string, string> = {
    customer_name: order.customerName,
    order_number: order.orderNumber,
    plan_label: planLabel,
    amount_paid: amountPaid,
    payment_id: paymentId,
    purchase_date: purchaseDate,
    expiry_date: expiryDate,
    validity_label: validityLabel,
    features_list: featuresListHtml,
    whatsapp_button: whatsappButtonHtml,
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
      .outer { max-width: 560px; margin: 0 auto; padding: 20px 16px; }
      .header { background-color: #0B2A20; border-radius: 12px 12px 0 0; padding: 22px 24px; }
      .header .wordmark { color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.3px; }
      .header .accent { color: #00d45f; }
      .wrap { background-color: #fff; padding: 28px 22px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
      h1 { color: #101010; font-size: 21px; margin: 0 0 4px; }
      .subtext { color: #6b6b6b; font-size: 14px; margin: 0 0 20px; }
      table.details { width: 100%; border-collapse: collapse; }
      table.details td { padding: 9px 0; border-bottom: 1px solid #EDEDED; font-size: 14px; }
      td.label { color: #6b6b6b; width: 45%; }
      td.value { color: #101010; font-weight: 600; text-align: right; }
      .rule { margin-top: 20px; padding: 14px 16px; background: #DFFBEA; border-radius: 10px; font-size: 13.5px; color: #013F32; }
      .plan-box { margin-top: 28px; border: 1px solid #EDEDED; border-radius: 12px; padding: 18px 16px; background: #FAFFFB; }
      .plan-box h2 { margin: 0 0 4px; font-size: 16px; color: #101010; }
      .plan-box .plan-sub { margin: 0; font-size: 13px; color: #6b6b6b; }
      .footer { margin-top: 24px; text-align: center; color: #9A9A9A; font-size: 12px; }
      .footer a { color: #00a84c; text-decoration: none; }
      @media only screen and (max-width: 600px) {
        .outer { padding: 10px 2px !important; }
        .header { padding: 14px 10px !important; }
        .wrap { padding: 16px 8px !important; }
        .plan-box { padding: 12px 8px !important; }
      }
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
        ${whatsappButtonHtml}
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
