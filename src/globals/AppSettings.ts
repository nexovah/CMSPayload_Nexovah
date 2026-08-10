import type { GlobalConfig } from 'payload'

// Application-wide backend settings (SMTP, security, performance, etc) —
// separate from Site Settings (which controls the public website's content).
// Rendered as a left-hand vertical menu instead of Payload's default horizontal
// tabs — see SettingsScopeMarker + src/app/(payload)/custom.css.
export const AppSettings: GlobalConfig = {
  slug: 'app-settings',
  label: 'Email Settings',
  admin: {
    description: 'Application-wide backend settings — SMTP, security, media uploads, and more.',
  },
  access: { read: ({ req }) => Boolean(req.user) },
  fields: [
    {
      name: 'scopeMarker',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/admin/SettingsScopeMarker#SettingsScopeMarker',
        },
      },
    },
    {
      type: 'tabs',
      admin: { className: 'app-settings-outer-tabs' },
      tabs: [
        {
          label: 'General',
          description: 'Backend/admin identity and outgoing-email defaults for this Payload instance — not the public website (that\'s Site Settings).',
          fields: [
            { name: 'siteName', type: 'text', defaultValue: 'Nexovah CMS', admin: { description: 'Internal name for this Payload instance (shown in the admin, emails, etc).' } },
            { name: 'rootUrl', type: 'text', admin: { description: 'Public URL of this Payload installation (no trailing slash).' } },
            { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo', admin: { description: 'Shown on admin-facing/system pages (e.g. the unsubscribe page) — not the public site.' } },
            { name: 'favicon', type: 'upload', relationTo: 'media', label: 'Favicon', admin: { description: 'Shown on admin-facing/system pages — not the public site.' } },
            {
              name: 'defaultFromEmail',
              type: 'text',
              admin: { description: 'Default `from` e-mail to show on outgoing campaign/system e-mails, e.g. "Nexovah <noreply@nexovah.com>". Can be changed per campaign.' },
            },
            {
              name: 'adminNotificationEmails',
              type: 'text',
              admin: { description: 'Comma separated list of e-mail addresses to which admin notifications (import updates, campaign completion, failure, etc) should be sent.' },
            },
            {
              name: 'subscriptionsHeading',
              type: 'ui',
              admin: { components: { Field: { path: '/components/admin/SectionHeading#SectionHeading', clientProps: { label: 'Subscriptions' } } } },
            },
            {
              name: 'enablePublicSubscriptionPage',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Show a public subscription page with all the public Contact Groups for people to subscribe to.' },
            },
            {
              name: 'sendOptInConfirmation',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Send an opt-in confirmation e-mail when subscribers sign up via the public form or when they are added by an admin.' },
            },
            {
              name: 'askDoubleOptIn',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Ask subscribers to confirm once they land on the double opt-in page, instead of confirming automatically.' },
            },
            {
              name: 'archiveHeading',
              type: 'ui',
              admin: { components: { Field: { path: '/components/admin/SectionHeading#SectionHeading', clientProps: { label: 'Archive' } } } },
            },
            {
              name: 'enablePublicArchive',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Publish campaigns on which archiving is enabled on the public website.' },
            },
            {
              name: 'showFullContentInRss',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Show full e-mail content in the RSS feed. If disabled, only the title and link elements are shown.' },
            },
            {
              name: 'checkForUpdates',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Periodically check for new app releases and notify.' },
            },
            {
              name: 'language',
              type: 'select',
              defaultValue: 'en',
              options: [{ label: 'English (en)', value: 'en' }],
            },
          ],
        },
        {
          label: 'Performance',
          description: 'Throughput/rate limiting for the campaign-sending engine — controls how fast and how much this system sends through whichever SMTP provider (Gmail / Amazon SES) is set active.',
          fields: [
            {
              name: 'concurrency',
              type: 'number',
              defaultValue: 10,
              admin: { description: 'Maximum concurrent worker (threads) that will attempt to send messages simultaneously.' },
            },
            {
              name: 'messageRate',
              type: 'number',
              defaultValue: 10,
              admin: {
                description:
                  'Maximum number of messages to be sent out per second per worker. If concurrency = 10 and message_rate = 10, then up to 10×10=100 messages may be pushed out every second. This, along with concurrency, should be tweaked to keep the net messages going out per second under the target message server\'s rate limits, if any — both Gmail API and AWS SES throttle aggressive bursts even within your daily allowance (set separately per-provider under SMTP → Daily send limit), so keep this conservative regardless of which provider is active.',
              },
            },
            {
              name: 'batchSize',
              type: 'number',
              defaultValue: 1000,
              admin: {
                description:
                  'The number of subscribers to pull from the database in a single iteration. Each iteration pulls subscribers from the database, sends messages to them, and then moves on to the next iteration to pull the next batch. This should ideally be higher than the maximum achievable throughput (concurrency * message_rate).',
              },
            },
            {
              name: 'maxErrorThreshold',
              type: 'number',
              defaultValue: 1000,
              label: 'Maximum error threshold',
              admin: {
                description:
                  'The number of errors (e.g. SMTP timeouts while e-mailing) a running campaign should tolerate before it is paused for manual investigation or intervention. Set to 0 to never pause.',
              },
            },
            {
              name: 'enableSlidingWindowLimit',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Limit the total number of messages that are sent out in a given period. On reaching this limit, messages are held from sending until the time window clears.' },
            },
            {
              name: 'slidingWindowMaxMessages',
              type: 'number',
              label: 'Max. messages',
              defaultValue: 10000,
              admin: { description: 'Maximum number of messages to send within the window duration.' },
            },
            {
              name: 'slidingWindowDuration',
              type: 'text',
              label: 'Duration',
              defaultValue: '1h',
              admin: { description: 'Duration of the sliding window period (m for minute, h for hour).' },
            },
            {
              name: 'cacheSlowDbQueries',
              type: 'checkbox',
              defaultValue: true,
              label: 'Cache slow database queries',
              admin: { description: 'Only enable this on large databases that have slowed down significantly. Caches list subscriber counts, dashboard statistics, etc.' },
            },
            {
              name: 'cronInterval',
              type: 'text',
              defaultValue: '0 3 * * *',
              admin: { description: 'Cron expression for periodic background jobs (e.g. bounce processing, stat rollups).' },
            },
          ],
        },
        {
          label: 'Privacy',
          description: 'Subscriber-privacy controls for outgoing campaigns and public subscriber-facing actions (unsubscribe, data export/wipe, etc).',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'disableTracking',
                  type: 'checkbox',
                  defaultValue: false,
                  admin: { description: 'Completely disable view and click tracking from campaigns.' },
                },
                {
                  name: 'individualSubscriberTracking',
                  type: 'checkbox',
                  defaultValue: false,
                  label: 'Individual subscriber tracking',
                  admin: {
                    description:
                      'Track subscriber-level campaign views and clicks. When disabled, view and click tracking continue without being linked to individual subscribers.',
                  },
                },
              ],
            },
            {
              name: 'includeListUnsubscribeHeader',
              type: 'checkbox',
              defaultValue: true,
              label: 'Include `List-Unsubscribe` header',
              admin: { description: 'Include unsubscription headers that allow e-mail clients to allow users to unsubscribe in a single click.' },
            },
            {
              name: 'allowBlocklisting',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Allow subscribers to unsubscribe from all mailing lists and mark themselves as blocklisted.' },
            },
            {
              name: 'allowPreferenceChanges',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Allow subscribers to change preferences such as their names and multiple list subscriptions.' },
            },
            {
              name: 'allowExporting',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Allow subscribers to export data collected on them.' },
            },
            {
              name: 'allowWiping',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                description:
                  'Allow subscribers to delete themselves including their subscriptions and all other data from the database. Campaign views and link clicks are also removed while view and click counts remain (with no subscriber associated to them) so that stats and analytics are not affected.',
              },
            },
            {
              name: 'recordOptInIp',
              type: 'checkbox',
              defaultValue: false,
              label: 'Record opt-in IP address',
              admin: { description: 'Record IP address of double opt-ins in subscriber attributes.' },
            },
            {
              type: 'tabs',
              tabs: [
                {
                  label: 'Domain blocklist',
                  fields: [
                    {
                      name: 'domainBlocklist',
                      type: 'textarea',
                      label: false,
                      admin: { description: 'E-mail addresses with these domains are disallowed from subscribing. Enter one domain per line, eg: example.com' },
                    },
                  ],
                },
                {
                  label: 'Domain allowlist',
                  fields: [
                    {
                      name: 'domainAllowlist',
                      type: 'textarea',
                      label: false,
                      admin: {
                        description:
                          'If set, only e-mail addresses with these domains are allowed to subscribe — every other domain is rejected. Enter one domain per line, eg: example.com. Leave empty to allow all domains (except any on the blocklist).',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Security',
          description: 'Admin login (SSO) and public-form protection — applies wherever this system authenticates admins or accepts public submissions (subscription forms, campaign links).',
          fields: [
            {
              name: 'enableOidcSso',
              type: 'checkbox',
              defaultValue: true,
              label: 'Enable OIDC SSO',
              admin: { description: 'Enable OpenID Connect OAuth2 login via an OAuth provider.' },
            },
            { name: 'oidcProviderUrl', type: 'text', label: 'Provider URL', admin: { placeholder: 'https://login.yoursite.com' } },
            {
              name: 'oidcProviderLinks',
              type: 'ui',
              admin: { components: { Field: '/components/admin/security/OidcProviderLinks#OidcProviderLinks' } },
            },
            { name: 'oidcProviderName', type: 'text', label: 'Provider name' },
            {
              name: 'oidcClientId',
              type: 'text',
              label: 'Client ID',
              validate: (value: string | null | undefined, { siblingData }: { siblingData: { enableOidcSso?: boolean } }) => {
                if (siblingData?.enableOidcSso && !value) return 'Please fill out this field.'
                return true
              },
            },
            {
              name: 'oidcClientSecret',
              type: 'text',
              label: 'Client secret',
              validate: (value: string | null | undefined, { siblingData }: { siblingData: { enableOidcSso?: boolean } }) => {
                if (siblingData?.enableOidcSso && !value) return 'Please fill out this field.'
                return true
              },
            },
            {
              name: 'autoCreateUsers',
              type: 'checkbox',
              defaultValue: true,
              label: 'Auto-create users',
              admin: { description: "Automatically create user on first login if the account doesn't exist." },
            },
            {
              name: 'defaultUserRole',
              type: 'select',
              label: 'Default user role',
              options: [
                { label: 'Moderator', value: 'moderator' },
                { label: 'Super Admin', value: 'super-admin' },
              ],
              admin: { description: 'Default role assigned to users auto-created from OIDC.' },
            },
            {
              name: 'defaultListRole',
              type: 'select',
              label: 'Default list role',
              defaultValue: 'none',
              options: [
                { label: '— None —', value: 'none' },
                { label: 'Moderator', value: 'moderator' },
              ],
              admin: { description: 'Default role assigned to users auto-created from OIDC.' },
            },
            {
              name: 'oidcRedirectUrlDisplay',
              type: 'ui',
              admin: { components: { Field: '/components/admin/security/RedirectUrlDisplay#RedirectUrlDisplay' } },
            },
            {
              name: 'enableCaptcha',
              type: 'checkbox',
              defaultValue: true,
              label: 'Enable CAPTCHA',
              admin: { description: 'Enable CAPTCHA on the public subscription form.' },
            },
            {
              name: 'captchaProvider',
              type: 'radio',
              defaultValue: 'altcha',
              options: [
                { label: 'ALTCHA', value: 'altcha' },
                { label: 'hCaptcha (deprecated)', value: 'hcaptcha' },
              ],
            },
            {
              name: 'altchaComplexity',
              type: 'number',
              label: 'Altcha Complexity',
              defaultValue: 300000,
              admin: { description: 'Higher values provide better security but slower solving (1000-1000000).' },
            },
            {
              name: 'trustedUrlsCors',
              type: 'textarea',
              label: 'Trusted URLs / CORS',
              admin: {
                placeholder: 'https://example.com',
                description:
                  'URLs for form redirection and CORS origins for browser Javascript requests. Enter one URL per line (e.g: https://example.com, http://example.com/thankyou.html). Leave empty to disable. Add * to allow all CORS origins (not valid for redirects and not recommended).',
              },
            },
          ],
        },
        {
          label: 'Media Uploads',
          description: 'Where campaign media (images used inside email campaigns) gets stored — your own filesystem, or an S3 bucket.',
          fields: [
            {
              name: 'mediaProvider',
              type: 'select',
              label: 'Provider',
              defaultValue: 'filesystem',
              options: [
                { label: 'filesystem', value: 'filesystem' },
                { label: 's3', value: 's3' },
              ],
            },
            {
              name: 'permittedFileExtensions',
              type: 'select',
              label: 'Permitted file extensions',
              hasMany: true,
              defaultValue: ['jpg', 'jpeg', 'png', 'gif', 'svg', '*'],
              options: [
                { label: 'jpg', value: 'jpg' },
                { label: 'jpeg', value: 'jpeg' },
                { label: 'png', value: 'png' },
                { label: 'gif', value: 'gif' },
                { label: 'svg', value: 'svg' },
                { label: 'webp', value: 'webp' },
                { label: 'pdf', value: 'pdf' },
                { label: '* (all file types)', value: '*' },
              ],
              admin: { description: 'Select all file extensions allowed for media uploads.' },
            },
            {
              name: 'uploadPath',
              type: 'text',
              label: 'Upload path',
              defaultValue: 'uploads',
              admin: {
                description: 'Path to the directory where media will be uploaded.',
                condition: (data) => data?.mediaProvider !== 's3',
              },
            },
            {
              name: 'uploadUri',
              type: 'text',
              label: 'Upload URI',
              defaultValue: '/uploads',
              admin: {
                description: "Upload URI that is visible to the outside world. The media uploaded to upload_path will be publicly accessible under {root_url}, for instance, https://listmonk.yoursite.com/uploads.",
                condition: (data) => data?.mediaProvider !== 's3',
              },
            },
            {
              name: 'awsRegion',
              type: 'text',
              label: 'Region',
              defaultValue: 'ap-south-1',
              admin: { condition: (data) => data?.mediaProvider === 's3' },
            },
            {
              name: 'awsAccessKey',
              type: 'text',
              label: 'AWS access key',
              admin: { condition: (data) => data?.mediaProvider === 's3' },
            },
            {
              name: 'awsAccessSecret',
              type: 'text',
              label: 'AWS access secret',
              admin: {
                description: 'Enter a value to change.',
                condition: (data) => data?.mediaProvider === 's3',
              },
            },
            {
              name: 'bucketType',
              type: 'select',
              label: 'Bucket type',
              defaultValue: 'public',
              options: [
                { label: 'Public', value: 'public' },
                { label: 'Private', value: 'private' },
              ],
              admin: { condition: (data) => data?.mediaProvider === 's3' },
            },
            {
              name: 'bucket',
              type: 'text',
              label: 'Bucket',
              admin: { condition: (data) => data?.mediaProvider === 's3' },
            },
            {
              name: 'bucketPath',
              type: 'text',
              label: 'Bucket path',
              defaultValue: '/',
              admin: {
                description: 'Path inside the bucket to upload files. Default is /',
                condition: (data) => data?.mediaProvider === 's3',
              },
            },
            {
              name: 'uploadExpiry',
              type: 'text',
              label: 'Upload expiry',
              defaultValue: '167h',
              admin: {
                description: '(Optional) Specify expiry for the generated presigned URL. Only applicable for private buckets (s, m, h, d for seconds, minutes, hours, days).',
                condition: (data) => data?.mediaProvider === 's3',
              },
            },
            {
              name: 's3BackendUrl',
              type: 'text',
              label: 'S3 backend URL',
              defaultValue: 'https://ap-south-1.s3.amazonaws.com',
              admin: {
                description: 'Only change if using a custom S3 compatible backend like Minio.',
                condition: (data) => data?.mediaProvider === 's3',
              },
            },
            {
              name: 'customPublicUrl',
              type: 'text',
              label: 'Custom public URL or path (optional)',
              admin: {
                placeholder: 'https://files.yourdomain.com',
                description: 'Custom URL (https://cdn.example.com) to use for image links, or a path starting with / (e.g., /uploads) to proxy files through this system.',
                condition: (data) => data?.mediaProvider === 's3',
              },
            },
          ],
        },
        {
          label: 'SMTP',
          description: 'Configure the email providers used to send Leads/Contacts/Newsletter/Campaign emails. Only Gmail and Amazon SES (via their SMTP relays) are supported.',
          fields: [
            {
              name: 'activeProvider',
              type: 'select',
              defaultValue: 'gmail',
              options: [
                { label: 'Gmail', value: 'gmail' },
                { label: 'Amazon SES', value: 'ses' },
              ],
              admin: {
                description: 'Which provider below actually sends system emails (Leads, Contacts, Newsletter, Campaigns). Only one is active at a time.',
              },
            },
            {
              name: 'smtpProviders',
              type: 'array',
              label: 'SMTP Providers',
              minRows: 1,
              maxRows: 2,
              admin: {
                description: 'Add one row per provider — Gmail and Amazon SES only.',
              },
              fields: [
                { name: 'enabled', type: 'checkbox', defaultValue: true },
                {
                  name: 'provider',
                  type: 'select',
                  required: true,
                  defaultValue: 'gmail',
                  options: [
                    { label: 'Gmail', value: 'gmail' },
                    { label: 'Amazon SES', value: 'ses' },
                  ],
                },
                { name: 'host', type: 'text', admin: { description: "SMTP server's host address." } },
                { name: 'port', type: 'number', defaultValue: 465, admin: { description: "SMTP server's port." } },
                {
                  name: 'authProtocol',
                  type: 'select',
                  defaultValue: 'LOGIN',
                  options: [
                    { label: 'LOGIN', value: 'LOGIN' },
                    { label: 'PLAIN', value: 'PLAIN' },
                    { label: 'CRAM-MD5', value: 'CRAM-MD5' },
                  ],
                },
                { name: 'username', type: 'text' },
                {
                  name: 'password',
                  type: 'text',
                  admin: { description: 'App Password (Gmail) or SMTP credentials (SES). Stored as plain text for now — wire up proper secret storage before going live.' },
                },
                {
                  name: 'quickFill',
                  type: 'ui',
                  admin: {
                    components: {
                      Field: '/components/admin/smtp/QuickFillButtons#QuickFillButtons',
                    },
                  },
                },
                {
                  name: 'heloHostname',
                  type: 'text',
                  admin: {
                    description:
                      'Optional. Some SMTP servers require a FQDN in the hostname. By default, HELOs go with `localhost`. Set this if a custom hostname should be used.',
                  },
                },
                {
                  name: 'tls',
                  type: 'select',
                  defaultValue: 'SSL/TLS',
                  options: [
                    { label: 'SSL/TLS', value: 'SSL/TLS' },
                    { label: 'STARTTLS', value: 'STARTTLS' },
                    { label: 'None', value: 'None' },
                  ],
                  admin: { description: 'TLS/SSL encryption. STARTTLS is commonly used.' },
                },
                {
                  name: 'skipTlsVerification',
                  type: 'checkbox',
                  defaultValue: false,
                  admin: { description: 'Skip hostname check on the TLS certificate.' },
                },
                {
                  name: 'maxConnections',
                  type: 'number',
                  defaultValue: 10,
                  admin: { description: 'Maximum concurrent connections to the server.' },
                },
                {
                  name: 'idleTimeout',
                  type: 'text',
                  defaultValue: '15s',
                  admin: { description: 'Time to wait for new activity on a connection before closing it and removing it from the pool (s for second, m for minute).' },
                },
                {
                  name: 'waitTimeout',
                  type: 'text',
                  defaultValue: '5s',
                  admin: { description: 'Time to wait for new activity on a connection before closing it and removing it from the pool (s for second, m for minute).' },
                },
                {
                  name: 'retries',
                  type: 'number',
                  defaultValue: 2,
                  admin: { description: 'Number of times to retry when a message fails.' },
                },
                {
                  name: 'dailySendLimit',
                  type: 'number',
                  label: 'Daily send limit',
                  defaultValue: 2000,
                  admin: {
                    description:
                      "Maximum emails this provider will send per day, across campaigns, drip steps, test sends, and auto-replies. Set to this provider's real daily quota — e.g. Gmail Workspace ≈ 2,000/day, AWS SES sandbox = 200/day, SES production = your approved AWS quota. Set 0 for unlimited. Resets automatically at the start of each day.",
                  },
                },
                { name: 'dailySendCount', type: 'number', defaultValue: 0, admin: { readOnly: true, hidden: true } },
                { name: 'dailySendCountDate', type: 'text', admin: { readOnly: true, hidden: true } },
                {
                  name: 'retryDelay',
                  type: 'text',
                  defaultValue: '10ms',
                  admin: { description: 'Time to wait before retrying after an error (s for second, m for minute). 0s disables the delay.' },
                },
                {
                  name: 'name',
                  type: 'text',
                  admin: { description: 'Optional unique name for this SMTP server, e.g. email-primary. Alphanumeric / dash.' },
                },
                {
                  name: 'fromAddresses',
                  type: 'text',
                  admin: { description: 'Optional list of e-mail addresses (user@example.com) or domains (example.com) to route through this SMTP server, comma separated.' },
                },
                {
                  name: 'customHeaders',
                  type: 'array',
                  label: 'Custom Headers',
                  admin: { initCollapsed: true, description: 'Optional custom headers attached to every email sent through this provider.' },
                  fields: [
                    { name: 'key', type: 'text', required: true },
                    { name: 'value', type: 'text', required: true },
                  ],
                },
                {
                  name: 'testConnection',
                  type: 'ui',
                  admin: {
                    components: {
                      Field: '/components/admin/smtp/TestConnectionButton#TestConnectionButton',
                    },
                  },
                },
              ],
            },
            {
              name: 'testEmailSender',
              type: 'ui',
              admin: {
                components: {
                  Field: '/components/admin/smtp/SendTestEmailPanel#SendTestEmailPanel',
                },
              },
            },
          ],
        },
        {
          label: 'Bounces',
          fields: [
            {
              name: 'bouncesUnderConstruction',
              type: 'ui',
              admin: { components: { Field: '/components/admin/UnderConstruction#UnderConstruction' } },
            },
          ],
        },
        {
          label: 'Appearance',
          fields: [
            {
              name: 'appearanceUnderConstruction',
              type: 'ui',
              admin: { components: { Field: '/components/admin/UnderConstruction#UnderConstruction' } },
            },
          ],
        },
      ],
    },
  ],
}
