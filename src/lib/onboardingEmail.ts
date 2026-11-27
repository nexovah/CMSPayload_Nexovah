import type { Payload } from 'payload'
import { sendEmail } from './sendEmail'

function fillTags(html: string, tags: Record<string, string>): string {
  return Object.entries(tags).reduce((acc, [key, value]) => acc.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), value), html)
}

// Same table-based button approach as orderConfirmation.ts's WhatsApp
// button — a solid bgcolor survives Outlook/Gmail's CSS stripping, a
// flex/gradient <button> would not.
function buildOnboardingButtonHtml(url: string, label: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px; width:100%;">
      <tr>
        <td align="center" bgcolor="#00D45F" style="border-radius:10px;">
          <a href="${url}" target="_blank" style="display:block; padding:13px 16px; font-size:14px; font-weight:700; color:#013025; text-decoration:none; white-space:nowrap; font-family:'Helvetica Neue','Segoe UI',Helvetica,sans-serif;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`
}

type OrderLike = {
  id: number | string
  orderNumber: string
  customerName: string
  customerEmail: string
  purchaseDate?: string | null
  status: string
  onboardingEmailSentAt?: string | null
}

// Runs on the same 60s-tick pattern as expiryReminders/campaignSend — checks
// every paid Order that hasn't had this email sent yet, and sends it once
// `delaySeconds` has elapsed since purchaseDate. DB-backed (onboardingEmailSentAt
// on the Order), not an in-memory setTimeout, so it survives this app's
// process restarting/sleeping between requests, same as every other
// scheduled-send feature in this codebase.
export async function runDueOnboardingEmails(payload: Payload): Promise<void> {
  const settings = await payload.findGlobal({ slug: 'onboarding-email' })
  if (!settings.enabled) return

  const template = settings.template as { rawHtml?: string } | number | null
  const templateDoc = typeof template === 'object' && template ? template : null
  if (!templateDoc?.rawHtml) return // no template selected — nothing to send

  const delayMs = (settings.delaySeconds ?? 60) * 1000
  const formUrl = settings.onboardingFormUrl || ''
  const buttonLabel = settings.buttonLabel || 'Submit Business Onboarding Form'
  const subject = settings.subject || 'Action Required: Complete Your Business Onboarding | Nexovah Technology'

  const { docs: orders } = await payload.find({
    collection: 'orders',
    where: {
      status: { equals: 'paid' },
      onboardingEmailSentAt: { exists: false },
    },
    limit: 1000,
    depth: 0,
  })

  for (const order of orders as OrderLike[]) {
    if (!order.purchaseDate) continue
    const dueAt = new Date(order.purchaseDate).getTime() + delayMs
    if (Date.now() < dueAt) continue

    const html = fillTags(templateDoc.rawHtml, {
      customer_name: order.customerName,
      order_number: order.orderNumber,
      onboarding_form_url: formUrl,
      onboarding_button: buildOnboardingButtonHtml(formUrl, buttonLabel),
    })

    try {
      await sendEmail(payload, { to: order.customerEmail, subject, html })
      // internalPaymentFlow bypasses Orders.ts's beforeChange hook, which
      // otherwise only allows admin-driven status transitions (Cancelled/
      // Refunded) — this update only ever touches onboardingEmailSentAt.
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { onboardingEmailSentAt: new Date().toISOString() },
        context: { internalPaymentFlow: true },
      })
      payload.logger.info(`Onboarding email sent for order ${order.orderNumber}.`)
    } catch (err) {
      payload.logger.error(`Onboarding email failed for order ${order.orderNumber}: ${err instanceof Error ? err.message : err}`)
    }
  }
}
