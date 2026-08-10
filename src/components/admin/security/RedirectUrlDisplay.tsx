'use client'

import { useFormFields } from '@payloadcms/ui'

// Read-only, computed from the Root URL set in Settings → General. Falls back
// to a demo example when Root URL hasn't been set yet, matching the reference
// design's placeholder look.
export function RedirectUrlDisplay() {
  const rootUrl = useFormFields(([fields]) => fields?.rootUrl?.value as string | undefined)
  const value = `${rootUrl || 'https://demo.yoursite.com'}/auth/oidc`

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Redirect URL for oAuth provider</label>
      <code
        style={{
          display: 'block',
          padding: '0.75rem 1rem',
          background: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-100)',
          borderRadius: 'var(--style-radius-m)',
          color: 'var(--theme-elevation-600)',
        }}
      >
        {value}
      </code>
    </div>
  )
}

export default RedirectUrlDisplay
