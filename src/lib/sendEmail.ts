import nodemailer from 'nodemailer'
import type { Payload } from 'payload'
import { checkAndConsumeDailyQuota } from './sendQuota'

export class SendEmailError extends Error {}
export class DailyLimitReachedError extends SendEmailError {}

/**
 * Builds a nodemailer transporter from whichever SMTP provider is set
 * "Active" in Email Settings → SMTP, reading fresh from the DB on every
 * call (not cached at boot) so switching providers or updating credentials
 * takes effect immediately without a server restart.
 */
export async function getActiveTransporter(payload: Payload) {
  const settings = await payload.findGlobal({ slug: 'app-settings' })
  const activeProvider = settings.activeProvider
  if (!activeProvider) {
    throw new SendEmailError('No Active Provider is set in Email Settings → SMTP.')
  }

  const row = (settings.smtpProviders ?? []).find((p) => p.provider === activeProvider && p.enabled !== false)
  if (!row) {
    throw new SendEmailError(`No enabled SMTP row found for the active provider (${activeProvider}) in Email Settings → SMTP.`)
  }
  if (!row.host || !row.port) {
    throw new SendEmailError('The active SMTP provider is missing a Host or Port in Email Settings → SMTP.')
  }
  if (!row.username || !row.password) {
    throw new SendEmailError('The active SMTP provider is missing a Username or Password in Email Settings → SMTP.')
  }

  const secure = row.tls === 'SSL/TLS'
  const requireTLS = row.tls === 'STARTTLS'

  const transporter = nodemailer.createTransport({
    host: row.host,
    port: row.port,
    secure,
    requireTLS,
    ignoreTLS: row.tls === 'None',
    tls: row.skipTlsVerification ? { rejectUnauthorized: false } : undefined,
    auth: { user: row.username, pass: row.password },
    name: row.heloHostname || undefined,
    connectionTimeout: 15000,
  })

  return { transporter, fromAddresses: row.fromAddresses }
}

export async function sendEmail(payload: Payload, args: { to: string | string[]; subject: string; html: string; from?: string }) {
  await checkAndConsumeDailyQuota(payload)

  const { transporter } = await getActiveTransporter(payload)
  const settings = await payload.findGlobal({ slug: 'app-settings' })
  // Falls back to a fixed default so sends (e.g. the lead auto-reply) don't
  // hard-fail just because Email Settings → Default From Email is unset —
  // Default From Email still wins whenever it's actually configured.
  const from = args.from || settings.defaultFromEmail || 'Nexovah <noreply@nexovah.com>'

  try {
    await transporter.verify()
  } catch (err) {
    throw new SendEmailError(`Could not connect to the SMTP server: ${err instanceof Error ? err.message : String(err)}`)
  }

  try {
    return await transporter.sendMail({ from, to: args.to, subject: args.subject, html: args.html })
  } catch (err) {
    throw new SendEmailError(`SMTP server rejected the send: ${err instanceof Error ? err.message : String(err)}`)
  }
}
