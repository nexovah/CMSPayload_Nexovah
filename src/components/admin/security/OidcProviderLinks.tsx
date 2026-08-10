'use client'

import { useForm } from '@payloadcms/ui'

// Only Google and Amazon are supported — matches the two SMTP providers this
// system sends email through. Clicking a link prefills Provider URL + Provider
// name so the admin doesn't need to look these up manually.
const PROVIDERS = {
  google: { name: 'Google', url: 'https://accounts.google.com' },
  amazon: { name: 'Amazon', url: 'https://www.amazon.com' },
} as const

type Props = { path: string }

export function OidcProviderLinks({ path }: Props) {
  const { dispatchFields } = useForm()
  const rowPath = path.split('.').slice(0, -1).join('.')

  const applyProvider = (key: keyof typeof PROVIDERS) => {
    const provider = PROVIDERS[key]
    dispatchFields({ type: 'UPDATE', path: rowPath ? `${rowPath}.oidcProviderUrl` : 'oidcProviderUrl', value: provider.url })
    dispatchFields({ type: 'UPDATE', path: rowPath ? `${rowPath}.oidcProviderName` : 'oidcProviderName', value: provider.name })
  }

  return (
    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
      {(Object.keys(PROVIDERS) as (keyof typeof PROVIDERS)[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => applyProvider(key)}
          style={{ background: 'none', border: 'none', color: 'var(--theme-success-500)', cursor: 'pointer', padding: 0, font: 'inherit' }}
        >
          {PROVIDERS[key].name}
        </button>
      ))}
    </div>
  )
}

export default OidcProviderLinks
