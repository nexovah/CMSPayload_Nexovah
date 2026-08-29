import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Services } from './collections/Services'
import { Showcases } from './collections/Showcases'
import { Blogs } from './collections/Blogs'
import { Leads } from './collections/Leads'
import { Contacts } from './collections/Contacts'
import { Newsletter } from './collections/Newsletter'
import { LeadSources } from './collections/LeadSources'
import { ContactGroups } from './collections/ContactGroups'
import { Campaigns } from './collections/Campaigns'
import { CampaignMedia } from './collections/CampaignMedia'
import { CampaignTemplates } from './collections/CampaignTemplates'
import { CampaignAnalytics } from './collections/CampaignAnalytics'
import { CampaignEnrollments } from './collections/CampaignEnrollments'
import { Categories } from './collections/Categories'
import { Redirects } from './collections/Redirects'
import { SiteSettings } from './globals/SiteSettings'
import { AppSettings } from './globals/AppSettings'
import { N8NSettings } from './globals/N8NSettings'
import { runDueScheduledCampaigns, resumeDailyLimitPausedCampaigns } from './lib/campaignSend'
import { runDueAutomationSteps } from './lib/automationSend'

const SCHEDULED_CAMPAIGN_CHECK_INTERVAL_MS = 60_000
const AUTOMATION_STEP_CHECK_INTERVAL_MS = 60_000
const DAILY_LIMIT_RESUME_CHECK_INTERVAL_MS = 60_000

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [
    Users,
    Media,
    Pages,
    Services,
    Showcases,
    Blogs,
    Leads,
    Contacts,
    Newsletter,
    LeadSources,
    ContactGroups,
    Campaigns,
    CampaignMedia,
    CampaignTemplates,
    CampaignAnalytics,
    CampaignEnrollments,
    Categories,
    Redirects,
  ],
  globals: [SiteSettings, AppSettings, N8NSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  // Every real frontend origin that reads this API — production, dev, and
  // local — needs to be allowed at once; a single FRONTEND_URL value can
  // only ever satisfy one of them, silently CORS-blocking the others.
  // FRONTEND_URL (if set) is prepended so it always wins as the primary.
  cors: [
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    'https://nexovah.com',
    'https://dev.nexovah.com',
    'http://localhost:8443',
  ],
  csrf: [
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    'https://nexovah.com',
    'https://dev.nexovah.com',
    'http://localhost:8443',
  ],
  onInit: async (payload) => {
    // Polls for campaigns whose scheduled send time has arrived. Runs
    // in-process — fine for this app's current scale/deployment shape
    // (a single Next.js server), but won't survive across multiple server
    // instances without a real job queue if this is ever horizontally scaled.
    setInterval(() => {
      runDueScheduledCampaigns(payload).catch((err) => payload.logger.error(`Scheduled campaign check failed: ${err instanceof Error ? err.message : err}`))
    }, SCHEDULED_CAMPAIGN_CHECK_INTERVAL_MS)

    // Polls for drip campaign enrollments whose next step is due. Same
    // in-process caveat as above.
    setInterval(() => {
      runDueAutomationSteps(payload).catch((err) => payload.logger.error(`Drip automation check failed: ${err instanceof Error ? err.message : err}`))
    }, AUTOMATION_STEP_CHECK_INTERVAL_MS)

    // Resumes one-shot campaigns paused mid-send by a provider's daily
    // limit, once a new day has begun.
    setInterval(() => {
      resumeDailyLimitPausedCampaigns(payload).catch((err) => payload.logger.error(`Daily-limit resume check failed: ${err instanceof Error ? err.message : err}`))
    }, DAILY_LIMIT_RESUME_CHECK_INTERVAL_MS)
  },
})
