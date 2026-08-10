'use client'

import { useState } from 'react'
import { Button, TextInput, toast } from '@payloadcms/ui'

// Placeholder — real test-email sending isn't wired up yet. Once nodemailer
// is connected, this posts to a custom endpoint that sends through whichever
// provider is set as "Active Provider" above. Built with Payload's own
// TextInput/Button primitives so it matches the rest of the admin's field styling.
export function SendTestEmailPanel() {
  const [email, setEmail] = useState('')

  const handleSend = () => {
    if (!email) {
      toast.error('Enter an email address to test.')
      return
    }
    toast.info('Sending isn’t wired up yet — this will send a real test email through the Active Provider once sending is connected.')
  }

  return (
    <div style={{ marginTop: 'calc(var(--base) * 2)', paddingTop: 'var(--base)', borderTop: '1px solid var(--theme-elevation-100)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--base)' }}>
        <div style={{ flex: 1 }}>
          <TextInput
            path="smtpTestEmail"
            label="To e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@site.com"
          />
        </div>
        <div style={{ paddingBottom: 'calc(var(--base) * 0.9)' }}>
          <Button buttonStyle="primary" onClick={handleSend}>
            Send e-mail
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SendTestEmailPanel
