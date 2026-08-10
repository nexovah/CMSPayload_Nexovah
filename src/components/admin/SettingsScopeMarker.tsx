'use client'

import { useEffect } from 'react'

// Invisible field — just tags <body> with a data attribute while this Global's
// edit view is mounted, so admin.scss can scope the vertical-sidebar tabs
// layout to only this page without affecting Pages/Services/etc's tabs.
export function SettingsScopeMarker() {
  useEffect(() => {
    document.body.dataset.pageScope = 'app-settings'
    return () => {
      delete document.body.dataset.pageScope
    }
  }, [])

  return null
}

export default SettingsScopeMarker
