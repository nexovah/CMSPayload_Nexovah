'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useForm, useFormFields, useListDrawer, useDocumentDrawer } from '@payloadcms/ui'

type MediaDoc = { id: string | number; filename?: string; url?: string; mimeType?: string }
type AttachmentRow = { media?: string | number | null; url?: string | null }

function Icon({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
const PaperclipIcon = () => <Icon><path d="M21.44 11.05 12.25 20.24a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95L9.41 17.41a1.5 1.5 0 0 1-2.12-2.12l8.49-8.49" /></Icon>
const PlusIcon = () => <Icon><path d="M12 5v14M5 12h14" /></Icon>
const UploadIcon = () => <Icon size={15}><path d="M12 21V9" /><path d="m7 14 5-5 5 5" /><path d="M5 3h14" /></Icon>
const LibraryIcon = () => <Icon size={15}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></Icon>
const LinkIcon = () => <Icon size={15}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></Icon>
const FileIcon = () => <Icon size={15}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /></Icon>
const XIcon = () => <Icon size={13}><path d="M18 6 6 18M6 6l12 12" /></Icon>

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '8px 12px',
  border: 'none',
  background: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: 13,
  color: 'inherit',
}

export function AttachmentsField() {
  const { dispatchFields, setModified } = useForm()
  const attachments = useFormFields(([fields]) => {
    const value = fields.attachments?.value
    return Array.isArray(value) ? (value as AttachmentRow[]) : []
  })

  const [expanded, setExpanded] = useState(attachments.length > 0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [urlPopoverOpen, setUrlPopoverOpen] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [mediaCache, setMediaCache] = useState<Record<string, MediaDoc>>({})
  const menuRef = useRef<HTMLDivElement>(null)

  const [ListDrawer, , { openDrawer: openListDrawer }] = useListDrawer({ collectionSlugs: ['campaign-media'] })
  const [DocDrawer, , { openDrawer: openDocDrawer }] = useDocumentDrawer({ collectionSlug: 'campaign-media' })

  // dispatchFields() alone doesn't flip the document's "modified" flag the
  // Save button checks (see TemplateEditorField for the full explanation) —
  // every write here must set it explicitly.
  const setAttachments = (next: AttachmentRow[]) => {
    dispatchFields({ type: 'UPDATE', path: 'attachments', value: next })
    setModified(true)
  }

  // Resolve filenames for rows that already reference a media doc but aren't
  // cached yet (e.g. reopening a saved campaign).
  useEffect(() => {
    const missing = attachments.filter((a) => a.media && !mediaCache[String(a.media)]).map((a) => String(a.media))
    if (missing.length === 0) return
    Promise.all(
      missing.map((id) =>
        fetch(`/api/campaign-media/${id}`, { credentials: 'include' })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    ).then((docs) => {
      setMediaCache((prev) => {
        const next = { ...prev }
        docs.forEach((d) => {
          if (d?.id) next[String(d.id)] = d
        })
        return next
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments])

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const addRow = (row: AttachmentRow) => setAttachments([...attachments, row])
  const removeRow = (index: number) => setAttachments(attachments.filter((_, i) => i !== index))

  const handleDocSaved = ({ doc }: { doc: Record<string, unknown> }) => {
    const media = doc as MediaDoc
    setMediaCache((prev) => ({ ...prev, [String(media.id)]: media }))
    addRow({ media: media.id })
    setMenuOpen(false)
  }

  const handleListSelect = ({ doc }: { doc: Record<string, unknown> }) => {
    const media = doc as MediaDoc
    setMediaCache((prev) => ({ ...prev, [String(media.id)]: media }))
    addRow({ media: media.id })
    setMenuOpen(false)
  }

  const handleAddUrl = () => {
    if (!urlValue.trim()) return
    addRow({ url: urlValue.trim() })
    setUrlValue('')
    setUrlPopoverOpen(false)
    setMenuOpen(false)
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-success-500, #2563eb)', fontSize: 13, padding: 0 }}
      >
        <PaperclipIcon /> Add attachments
      </button>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
          <PaperclipIcon /> Attachments
        </span>
      </div>

      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {attachments.map((row, i) => {
            const doc = row.media ? mediaCache[String(row.media)] : undefined
            const label = row.url ? row.url : doc?.filename ?? (row.media ? 'Loading…' : 'Unknown')
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  border: '1px solid var(--theme-elevation-150, #ddd)',
                  borderRadius: 5,
                  fontSize: 13,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  {row.url ? <LinkIcon /> : <FileIcon />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                </span>
                <button type="button" onClick={() => removeRow(i)} title="Remove" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-elevation-400, #999)', display: 'flex' }}>
                  <XIcon />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ position: 'relative', display: 'inline-block' }} ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          title="Add attachment"
          style={{
            width: 34,
            height: 34,
            borderRadius: 6,
            border: '1px dashed var(--theme-elevation-300, #aaa)',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--theme-elevation-500, #666)',
          }}
        >
          <PlusIcon />
        </button>

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: 0,
              zIndex: 50,
              background: 'var(--theme-elevation-0, #fff)',
              border: '1px solid var(--theme-elevation-150, #ddd)',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              width: 240,
              overflow: 'hidden',
            }}
          >
            <button type="button" style={menuItemStyle} onClick={() => { setMenuOpen(false); openDocDrawer() }}>
              <UploadIcon /> Upload from device
            </button>
            <button type="button" style={menuItemStyle} onClick={() => { setMenuOpen(false); openListDrawer() }}>
              <LibraryIcon /> Choose from Campaign Media
            </button>
            <button type="button" style={menuItemStyle} onClick={() => setUrlPopoverOpen(true)}>
              <LinkIcon /> Paste URL
            </button>

            {urlPopoverOpen && (
              <div style={{ padding: 10, borderTop: '1px solid var(--theme-elevation-150, #ddd)', display: 'flex', gap: 6 }}>
                <input
                  autoFocus
                  type="text"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                  placeholder="https://…"
                  style={{ flex: 1, padding: '6px 8px', fontSize: 12, border: '1px solid var(--theme-elevation-150, #ccc)', borderRadius: 4, background: 'var(--theme-input-bg, transparent)', color: 'inherit' }}
                />
                <button type="button" onClick={handleAddUrl} style={{ padding: '6px 10px', fontSize: 12, background: 'var(--theme-success-500, #2563eb)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                  Add
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <DocDrawer onSave={handleDocSaved} />
      <ListDrawer onSelect={handleListSelect} />
    </div>
  )
}

export default AttachmentsField
