import type { Payload } from 'payload'
import { DailyLimitReachedError } from './sendEmail'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Enforces the Active SMTP provider's own daily send limit (Email Settings
 * → SMTP → each row's "Daily send limit") — deliberately per-provider, not
 * one global number, so Gmail and SES (added later) each track and reset
 * independently and switching `activeProvider` never shares or resets the
 * other's count. Called once per send from sendEmail() before the actual
 * transporter.sendMail, so it covers every send path (campaigns, drip
 * steps, test sends, lead auto-replies) from a single choke point.
 */
export async function checkAndConsumeDailyQuota(payload: Payload): Promise<void> {
  const settings = await payload.findGlobal({ slug: 'app-settings' })
  const activeProvider = settings.activeProvider
  const providers = settings.smtpProviders ?? []
  const rowIndex = providers.findIndex((p) => p.provider === activeProvider && p.enabled !== false)
  if (rowIndex === -1) return // no active/enabled row — sendEmail's own getActiveTransporter will raise the real error

  const row = providers[rowIndex]
  const limit = row.dailySendLimit ?? 0
  const isNewDay = row.dailySendCountDate !== today()
  const currentCount = isNewDay ? 0 : (row.dailySendCount ?? 0)

  if (limit > 0 && currentCount >= limit) {
    throw new DailyLimitReachedError(
      `Daily send limit reached for ${activeProvider} (${limit}/day). Sending will resume automatically once the limit resets tomorrow.`,
    )
  }

  const nextProviders = providers.map((p, i) => (i === rowIndex ? { ...p, dailySendCount: currentCount + 1, dailySendCountDate: today() } : p))
  await payload.updateGlobal({ slug: 'app-settings', data: { smtpProviders: nextProviders } })
}
