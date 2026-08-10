'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Button } from '@payloadcms/ui'

const TITLE_ACTIONS_SELECTOR = '.list-header__title-actions'

// Payload's list header hardcodes its TitleActions (just "Create New" +
// optional bulk-upload/empty-trash buttons) — there's no config slot to
// add another button beside it. Rendered via `beforeListTable`
// (Campaigns.ts), this portals itself straight into that DOM node instead,
// so it sits truly next to "Create New" rather than in a different part of
// the page. Watches for the node via MutationObserver since the header can
// mount slightly after this component does.
export function DripCampaignButton() {
  const [container, setContainer] = useState<Element | null>(null)

  useEffect(() => {
    const existing = document.querySelector(TITLE_ACTIONS_SELECTOR)
    if (existing) {
      setContainer(existing)
      return
    }
    const observer = new MutationObserver(() => {
      const found = document.querySelector(TITLE_ACTIONS_SELECTOR)
      if (found) {
        setContainer(found)
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  const button = (
    <span style={{ marginLeft: 15 }}>
      <Link href="/admin/collections/campaigns/create?campaignType=drip">
        <Button buttonStyle="secondary" size="small">
          + Drip Campaign
        </Button>
      </Link>
    </span>
  )

  return container ? createPortal(button, container) : null
}

export default DripCampaignButton
