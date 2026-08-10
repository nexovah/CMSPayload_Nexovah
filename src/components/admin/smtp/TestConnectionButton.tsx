'use client'

import { toast } from '@payloadcms/ui'

// Placeholder — real SMTP connection testing (nodemailer) isn't wired up yet.
// Wired in a later step once real Gmail/SES credentials are available to test against.
export function TestConnectionButton() {
  return (
    <div style={{ marginTop: '1rem', textAlign: 'right' }}>
      <button
        type="button"
        onClick={() =>
          toast.info('Test connection isn’t wired up yet — save this provider, then this button will send a live test through it once sending is connected.')
        }
        style={{ background: 'none', border: 'none', color: 'var(--theme-elevation-450)', cursor: 'pointer', padding: 0, font: 'inherit' }}
      >
        🚀 Test connection
      </button>
    </div>
  )
}

export default TestConnectionButton
