'use client'

import { useForm } from '@payloadcms/ui'

// Known-good SMTP relay defaults for the two providers we support. Clicking a
// button fills in this row's Host/Port/Auth protocol/TLS — the same fields
// visible above, just pre-populated so the admin doesn't need to look them up.
const PROVIDER_DEFAULTS = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 465,
    authProtocol: 'LOGIN',
    tls: 'SSL/TLS',
  },
  ses: {
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: 587,
    authProtocol: 'LOGIN',
    tls: 'STARTTLS',
  },
} as const

type Props = { path: string }

export function QuickFillButtons({ path }: Props) {
  const { dispatchFields } = useForm()
  // path is this ui field's own path, e.g. "smtpProviders.0.quickFill" —
  // strip the last segment to address sibling fields in the same row.
  const rowPath = path.split('.').slice(0, -1).join('.')

  const applyDefaults = (key: keyof typeof PROVIDER_DEFAULTS) => {
    const defaults = PROVIDER_DEFAULTS[key]
    dispatchFields({ type: 'UPDATE', path: `${rowPath}.provider`, value: key })
    dispatchFields({ type: 'UPDATE', path: `${rowPath}.host`, value: defaults.host })
    dispatchFields({ type: 'UPDATE', path: `${rowPath}.port`, value: defaults.port })
    dispatchFields({ type: 'UPDATE', path: `${rowPath}.authProtocol`, value: defaults.authProtocol })
    dispatchFields({ type: 'UPDATE', path: `${rowPath}.tls`, value: defaults.tls })
  }

  return (
    <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
      <button
        type="button"
        onClick={() => applyDefaults('gmail')}
        style={{ background: 'none', border: 'none', color: 'var(--theme-success-500)', cursor: 'pointer', padding: 0, font: 'inherit' }}
      >
        Gmail
      </button>
      <button
        type="button"
        onClick={() => applyDefaults('ses')}
        style={{ background: 'none', border: 'none', color: 'var(--theme-success-500)', cursor: 'pointer', padding: 0, font: 'inherit' }}
      >
        Amazon SES
      </button>
    </div>
  )
}

export default QuickFillButtons
