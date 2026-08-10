'use client'

import React from 'react'
import { Gutter } from '@payloadcms/ui'
import AnalyticsDashboard from './AnalyticsDashboard'

// Fully replaces the native List view for campaign-analytics (search bar,
// table, Create New, pagination) — this collection exists purely as an
// anchor for the dashboard below, not a document list. Rendered inside
// Payload's own Gutter so the width matches every other admin page exactly.
export function AnalyticsListView() {
  return (
    <Gutter>
      <h1 style={{ marginBottom: 4 }}>Analytics</h1>
      <p style={{ color: 'var(--theme-elevation-450)', marginTop: 0, marginBottom: 24 }}>
        Live dashboards computed from real campaign send/open/click/unsubscribe data — nothing below is hardcoded.
      </p>
      <AnalyticsDashboard />
    </Gutter>
  )
}

export default AnalyticsListView
