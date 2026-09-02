import type { Payload } from 'payload'
import Razorpay from 'razorpay'
import { sendEmail } from './sendEmail'

const PLAN_LABELS: Record<string, string> = {
  monthly: '₹399 / 1 Month',
  yearly: '₹4,999 / 1 Year',
}

type ReminderStep = { key: '7d' | '3d' | '0d'; daysBefore: number; globalField: 'sevenDayReminder' | 'threeDayReminder' | 'expiryDayReminder' }

const STEPS: ReminderStep[] = [
  { key: '7d', daysBefore: 7, globalField: 'sevenDayReminder' },
  { key: '3d', daysBefore: 3, globalField: 'threeDayReminder' },
  { key: '0d', daysBefore: 0, globalField: 'expiryDayReminder' },
]

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(iso))
}

// Date-only comparison (ignores time-of-day) — a customer's expiryDate
// carries the exact payment timestamp, but "7 days before" should match
// the whole calendar day, not a specific hour.
function daysBetween(a: Date, b: Date): number {
  const aUTC = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
  const bUTC = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  return Math.round((bUTC - aUTC) / (24 * 60 * 60 * 1000))
}

function fillTags(html: string, tags: Record<string, string>): string {
  return Object.entries(tags).reduce((acc, [key, value]) => acc.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), value), html)
}

// A fresh Razorpay Payment Link for renewing this exact package, generated
// per send (not reused/cached) — so each reminder email always carries a
// live, working link even if an earlier one was already paid or expired.
// Never throws: a renewal link failing to generate must not block the
// reminder email itself from going out — it just sends without one.
async function createRenewalLink(
  payload: Payload,
  customer: { id: number | string; name: string; email: string; phone: string },
  pkg: { name: string; price: number } | null,
): Promise<string> {
  const key_id = process.env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET
  if (!key_id || !key_secret || !pkg) return ''

  try {
    const client = new Razorpay({ key_id, key_secret })
    const link = await client.paymentLink.create({
      amount: Math.round(pkg.price * 100),
      currency: 'INR',
      description: `${pkg.name} renewal — Nexovah Technology`,
      customer: { name: customer.name, email: customer.email, contact: customer.phone },
      notify: { sms: false, email: false },
      reference_id: `RENEW-${customer.id}-${Date.now()}`,
    })
    return link.short_url
  } catch (err) {
    payload.logger.error(`Renewal payment link creation failed for customer ${customer.id}: ${err instanceof Error ? err.message : err}`)
    return ''
  }
}

// Runs on the same 60s-tick pattern as campaignSend/automationSend. For each
// of the 3 fixed steps, finds Customers whose expiryDate is exactly N days
// from today and who haven't already been sent that step, sends the
// configured template, and marks the step sent so it never repeats.
export async function runDueExpiryReminders(payload: Payload): Promise<void> {
  const settings = await payload.findGlobal({ slug: 'expiry-reminders' })
  const today = new Date()

  const { docs: customers } = await payload.find({ collection: 'customers', limit: 1000, depth: 1 })

  for (const step of STEPS) {
    const stepSettings = settings[step.globalField] as { enabled?: boolean; template?: number | { id: number; rawHtml?: string } } | undefined
    if (!stepSettings?.enabled) continue

    const template = stepSettings.template
    const templateDoc = typeof template === 'object' && template ? template : null
    if (!templateDoc?.rawHtml) continue // no template selected/found for this step — nothing to send

    for (const customer of customers) {
      if (!customer.expiryDate) continue
      const alreadySent = (customer.remindersSent ?? []).includes(step.key)
      if (alreadySent) continue

      const diff = daysBetween(today, new Date(customer.expiryDate))
      if (diff !== step.daysBefore) continue

      const pkg = typeof customer.package === 'object' ? customer.package : null
      const planLabel = (pkg && PLAN_LABELS[(pkg as { planKey?: string }).planKey || '']) || pkg?.name || 'your plan'
      const planName = pkg?.name || 'your plan'
      // pkg.description is now richText (Lexical JSON) for formatting in the
      // admin editor — descriptionHtml is the pre-converted HTML string
      // (computed on every read, see Products.ts) that's actually safe to
      // drop into an email body.
      const planDescription = (pkg as { descriptionHtml?: string } | null)?.descriptionHtml || ''

      const renewalLink = await createRenewalLink(payload, customer, pkg ? { name: pkg.name, price: pkg.price } : null)

      const html = fillTags(templateDoc.rawHtml, {
        customer_name: customer.name,
        plan_label: planLabel,
        plan_name: planName,
        plan_description: planDescription,
        purchase_date: formatDate(customer.purchaseDate),
        expiry_date: formatDate(customer.expiryDate),
        days_remaining: String(step.daysBefore),
        renewal_link: renewalLink,
      })

      const subject =
        step.key === '0d'
          ? `Your ${planName} expires today — Nexovah Technology`
          : `Your ${planName} expires in ${step.daysBefore} days — Nexovah Technology`

      try {
        await sendEmail(payload, { to: customer.email, subject, html })
        await payload.update({
          collection: 'customers',
          id: customer.id,
          data: { remindersSent: [...(customer.remindersSent ?? []), step.key] },
        })
        payload.logger.info(`Expiry reminder (${step.key}) sent to ${customer.email}.`)
      } catch (err) {
        payload.logger.error(`Expiry reminder (${step.key}) failed for ${customer.email}: ${err instanceof Error ? err.message : err}`)
      }
    }
  }
}
