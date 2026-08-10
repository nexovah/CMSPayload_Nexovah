'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useFormFields, useFormModified, useDocumentInfo, CodeEditor } from '@payloadcms/ui'

import {
  DEFAULT_STYLES,
  FONT_STACKS,
  parseStylesFromHtml,
  extractWrapInner,
  setWrapInner,
  renderPreviewHtml,
} from './emailStyles'

const DRAFT_DEBOUNCE_MS = 600
const AUTOSAVE_INTERVAL_MS = 20000

type DraftShape = {
  savedAt: number
  name: string
  type: string
  status: string
  isDefault: boolean
  previewText: string
  rawHtml: string
}

function draftKey(docId: string | number | undefined) {
  return `nx-campaign-template-draft-${docId ?? 'new'}`
}

// ─── Icons ─────────────────────────────────────────────────────────────────

function Icon({ children, size = 17, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  )
}
const EditIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>
const PreviewIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></Icon>
const HtmlIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p}><path d="m8 6-6 6 6 6" /><path d="m16 6 6 6-6 6" /></Icon>
const JsonIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p}><path d="M7 3a3 3 0 0 0-3 3v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a3 3 0 0 0 3 3" /><path d="M17 3a3 3 0 0 1 3 3v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a3 3 0 0 1-3 3" /></Icon>
const DownloadIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></Icon>
const UploadIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p}><path d="M12 21V9" /><path d="m7 14 5-5 5 5" /><path d="M5 3h14" /></Icon>
const DesktopIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p}><rect x="3" y="4" width="18" height="12" rx="1" /><path d="M8 20h8M12 16v4" /></Icon>
const MobileIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></Icon>
const FullscreenIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p}><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></Icon>
const ExitFullscreenIcon = (p: React.SVGProps<SVGSVGElement>) => <Icon {...p}><path d="M9 3v4a2 2 0 0 1-2 2H3" /><path d="M15 3v4a2 2 0 0 0 2 2h4" /><path d="M3 15h4a2 2 0 0 1 2 2v4" /><path d="M21 15h-4a2 2 0 0 0-2 2v4" /></Icon>

// ─── Debounce helper ────────────────────────────────────────────────────────

function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fnRef = useRef(fn)
  fnRef.current = fn
  return useMemo(() => {
    const debounced = (...args: A) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => fnRef.current(...args), delay)
    }
    debounced.cancel = () => {
      if (timer.current) clearTimeout(timer.current)
    }
    return debounced
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay])
}

// ─── Main field ─────────────────────────────────────────────────────────────

export function TemplateEditorField() {
  const { dispatchFields, setModified, submit } = useForm()
  const modified = useFormModified()
  const { data: docData } = useDocumentInfo()
  const docId = docData?.id as string | number | undefined

  const rawHtml = useFormFields(([fields]) => (fields.rawHtml?.value as string) ?? '')
  const name = useFormFields(([fields]) => (fields.name?.value as string) ?? '')
  const type = useFormFields(([fields]) => (fields.type?.value as string) ?? '')
  const status = useFormFields(([fields]) => (fields.status?.value as string) ?? '')
  const isDefault = useFormFields(([fields]) => Boolean(fields.isDefault?.value))
  const previewText = useFormFields(([fields]) => (fields.previewText?.value as string) ?? '')

  const rawHtmlRef = useRef(rawHtml)
  rawHtmlRef.current = rawHtml

  // Edit tab reads its colors straight from whatever's actually in the HTML
  // right now — same source Preview uses — so the two can never drift apart
  // the way panel-driven vs. HTML-driven state used to.
  const liveStyles = useMemo(() => ({ ...DEFAULT_STYLES, ...parseStylesFromHtml(rawHtml) }), [rawHtml])

  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'html' | 'json'>('edit')
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [fullscreen, setFullscreen] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [restoreBanner, setRestoreBanner] = useState<DraftShape | null>(null)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const restoredRef = useRef(false)

  // dispatchFields() alone only updates the field's own state — it does NOT
  // flip the document's top-level "modified" flag the Save button checks
  // (that only happens inside Payload's own useField() setValue helper,
  // which none of these custom fields use). Every write here has to set it
  // explicitly, or Save stays permanently disabled no matter what you edit.
  const setRawHtml = (value: string) => {
    dispatchFields({ type: 'UPDATE', path: 'rawHtml', value })
    setModified(true)
  }

  // ── Crash-recovery draft (localStorage) ──────────────────────────────────

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = localStorage.getItem(draftKey(docId))
      if (!raw) return
      const draft: DraftShape = JSON.parse(raw)
      const savedUpdatedAt = docData?.updatedAt ? new Date(docData.updatedAt as string).getTime() : 0
      if (draft.savedAt > savedUpdatedAt && draft.rawHtml && draft.rawHtml !== rawHtmlRef.current) {
        setRestoreBanner(draft)
      }
    } catch {
      // ignore corrupt draft
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId])

  const saveDraftToStorage = useDebouncedCallback(() => {
    try {
      const draft: DraftShape = { savedAt: Date.now(), name, type, status, isDefault, previewText, rawHtml: rawHtmlRef.current }
      localStorage.setItem(draftKey(docId), JSON.stringify(draft))
    } catch {
      // storage full/unavailable — not fatal, just no crash-recovery this session
    }
  }, DRAFT_DEBOUNCE_MS)

  useEffect(() => {
    saveDraftToStorage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawHtml, name, type, status, isDefault, previewText])

  const applyDraft = (draft: DraftShape) => {
    dispatchFields({ type: 'UPDATE', path: 'name', value: draft.name })
    dispatchFields({ type: 'UPDATE', path: 'type', value: draft.type })
    dispatchFields({ type: 'UPDATE', path: 'status', value: draft.status })
    dispatchFields({ type: 'UPDATE', path: 'isDefault', value: draft.isDefault })
    dispatchFields({ type: 'UPDATE', path: 'previewText', value: draft.previewText })
    setRawHtml(draft.rawHtml)
    setRestoreBanner(null)
  }

  const discardDraft = () => {
    try {
      localStorage.removeItem(draftKey(docId))
    } catch {
      // ignore
    }
    setRestoreBanner(null)
  }

  // ── Periodic autosave (real save, not just the local crash-recovery copy) ─

  useEffect(() => {
    const interval = setInterval(() => {
      if (!modified) return
      setAutosaveStatus('saving')
      Promise.resolve(submit({ skipValidation: true }))
        .then(() => {
          setAutosaveStatus('saved')
          try {
            localStorage.removeItem(draftKey(docId))
          } catch {
            // ignore
          }
          setTimeout(() => setAutosaveStatus('idle'), 2000)
        })
        .catch(() => setAutosaveStatus('idle'))
    }, AUTOSAVE_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modified, docId])

  // Sync the contentEditable canvas from rawHtml only on mount / tab switch —
  // never on every keystroke, or the caret would jump on each render.
  useEffect(() => {
    if (activeTab === 'edit' && editorRef.current) {
      editorRef.current.innerHTML = extractWrapInner(rawHtml)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleEditorInput = () => {
    if (!editorRef.current) return
    setRawHtml(setWrapInner(rawHtml, editorRef.current.innerHTML))
  }

  const handleDownload = () => {
    const blob = new Blob([rawHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(name || 'template').replace(/\s+/g, '-').toLowerCase()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleUploadClick = () => fileInputRef.current?.click()
  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setRawHtml(String(reader.result ?? ''))
    reader.readAsText(file)
    e.target.value = ''
  }

  const previewSrcDoc = useMemo(() => renderPreviewHtml(rawHtml), [rawHtml])

  const jsonView = useMemo(
    () => JSON.stringify({ name, type, status, isDefault, previewText, rawHtml }, null, 2),
    [name, type, status, isDefault, previewText, rawHtml],
  )

  const applyJson = useDebouncedCallback((text: string) => {
    try {
      const parsed = JSON.parse(text)
      if (typeof parsed !== 'object' || parsed === null) throw new Error('JSON must be an object')
      setJsonError(null)
      if (typeof parsed.name === 'string') dispatchFields({ type: 'UPDATE', path: 'name', value: parsed.name })
      if (typeof parsed.type === 'string') dispatchFields({ type: 'UPDATE', path: 'type', value: parsed.type })
      if (typeof parsed.status === 'string') dispatchFields({ type: 'UPDATE', path: 'status', value: parsed.status })
      if (typeof parsed.isDefault === 'boolean') dispatchFields({ type: 'UPDATE', path: 'isDefault', value: parsed.isDefault })
      if (typeof parsed.previewText === 'string') dispatchFields({ type: 'UPDATE', path: 'previewText', value: parsed.previewText })
      if (typeof parsed.rawHtml === 'string') dispatchFields({ type: 'UPDATE', path: 'rawHtml', value: parsed.rawHtml })
      setModified(true)
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }, 500)

  const [jsonDraftText, setJsonDraftText] = useState(jsonView)
  useEffect(() => {
    if (activeTab === 'json') setJsonDraftText(jsonView)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Cancel any in-flight debounced work on unmount so a timer never fires
  // setState on an already-unmounted instance (e.g. after navigating away).
  useEffect(() => {
    return () => {
      saveDraftToStorage.cancel()
      applyJson.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '9px 11px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: active ? 'var(--theme-text, #111)' : 'var(--theme-elevation-400, #999)',
    borderBottom: active ? '2px solid var(--theme-success-500, #2563eb)' : '2px solid transparent',
    display: 'flex',
    alignItems: 'center',
  })

  const iconBtnStyle: React.CSSProperties = {
    padding: 7,
    border: 'none',
    background: 'none',
    borderRadius: 5,
    cursor: 'pointer',
    color: 'var(--theme-elevation-500, #666)',
    display: 'flex',
    alignItems: 'center',
  }

  const canvasWidth = device === 'mobile' ? 375 : 525

  const containerStyle: React.CSSProperties = fullscreen
    ? { position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--theme-bg, #111)', display: 'flex', flexDirection: 'column' }
    : { marginBottom: '1.5rem' }

  return (
    <div style={containerStyle}>
      {restoreBanner && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            marginBottom: 10,
            background: 'var(--theme-warning-100, #3a2f00)',
            border: '1px solid var(--theme-warning-500, #a87f00)',
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <span>
            Unsaved changes from a previous session were found ({new Date(restoreBanner.savedAt).toLocaleString()}). Restore them?
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => applyDraft(restoreBanner)} style={{ ...iconBtnStyle, background: 'var(--theme-success-500, #2563eb)', color: '#fff', padding: '5px 12px' }}>
              Restore
            </button>
            <button type="button" onClick={discardDraft} style={{ ...iconBtnStyle, padding: '5px 12px' }}>
              Discard
            </button>
          </div>
        </div>
      )}

      <div style={{ border: '1px solid var(--theme-elevation-150, #333)', borderRadius: 6, overflow: 'hidden', flex: fullscreen ? 1 : undefined, display: fullscreen ? 'flex' : 'block', flexDirection: fullscreen ? 'column' : undefined, minHeight: 0 }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', borderBottom: '1px solid var(--theme-elevation-150, #333)' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" style={tabBtnStyle(activeTab === 'edit')} onClick={() => setActiveTab('edit')} title="Edit">
              <EditIcon />
            </button>
            <button type="button" style={tabBtnStyle(activeTab === 'preview')} onClick={() => setActiveTab('preview')} title="Preview">
              <PreviewIcon />
            </button>
            <button type="button" style={tabBtnStyle(activeTab === 'html')} onClick={() => setActiveTab('html')} title="HTML">
              <HtmlIcon />
            </button>
            <button type="button" style={tabBtnStyle(activeTab === 'json')} onClick={() => setActiveTab('json')} title="JSON">
              <JsonIcon />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {autosaveStatus !== 'idle' && (
              <span style={{ fontSize: 11, color: 'var(--theme-elevation-400, #999)', marginRight: 6 }}>
                {autosaveStatus === 'saving' ? 'Saving…' : 'Saved'}
              </span>
            )}
            <button type="button" style={iconBtnStyle} onClick={handleDownload} title="Download HTML">
              <DownloadIcon />
            </button>
            <button type="button" style={iconBtnStyle} onClick={handleUploadClick} title="Upload HTML">
              <UploadIcon />
            </button>
            <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleUploadFile} style={{ display: 'none' }} />
            <button
              type="button"
              style={{ ...iconBtnStyle, background: device === 'desktop' ? 'var(--theme-elevation-100, #2a2a2a)' : 'none' }}
              onClick={() => setDevice('desktop')}
              title="Desktop preview"
            >
              <DesktopIcon />
            </button>
            <button
              type="button"
              style={{ ...iconBtnStyle, background: device === 'mobile' ? 'var(--theme-elevation-100, #2a2a2a)' : 'none' }}
              onClick={() => setDevice('mobile')}
              title="Mobile preview"
            >
              <MobileIcon />
            </button>
            <button type="button" style={iconBtnStyle} onClick={() => setFullscreen((f) => !f)} title={fullscreen ? 'Exit full screen' : 'Full screen'}>
              {fullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: fullscreen ? 1 : undefined,
            background: activeTab === 'edit' ? liveStyles.backdropColor : 'var(--theme-elevation-50, #2a2a2a)',
            padding: activeTab === 'edit' ? '32px 24px' : 0,
            minHeight: fullscreen ? 0 : 560,
            height: fullscreen ? '100%' : undefined,
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          {activeTab === 'edit' && (
            <div
              style={{
                width: device === 'mobile' ? canvasWidth : 525,
                maxWidth: '100%',
                background: liveStyles.canvasColor,
                color: liveStyles.textColor,
                fontFamily: FONT_STACKS[liveStyles.fontFamily],
                borderRadius: liveStyles.canvasBorderRadius,
                border: liveStyles.canvasBorderColor ? `1px solid ${liveStyles.canvasBorderColor}` : undefined,
                padding: 30,
                height: 'fit-content',
                outline: 'none',
                transition: 'width 0.2s ease',
              }}
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
            />
          )}
          {activeTab === 'preview' && (
            <iframe
              title="Template preview"
              style={{
                width: device === 'mobile' ? canvasWidth : '100%',
                maxWidth: '100%',
                height: fullscreen ? '100%' : 560,
                border: 'none',
                background: '#fff',
                transition: 'width 0.2s ease',
                borderRadius: device === 'mobile' ? 18 : 0,
                boxShadow: device === 'mobile' ? '0 0 0 8px #111, 0 0 0 9px #444' : 'none',
              }}
              srcDoc={previewSrcDoc}
            />
          )}
          {activeTab === 'html' && (
            <div style={{ width: '100%', height: fullscreen ? '100%' : undefined }}>
              <CodeEditor
                value={rawHtml}
                language="html"
                onChange={(v: string | undefined) => setRawHtml(v ?? '')}
                minHeight={fullscreen ? 400 : 560}
                maxHeight={fullscreen ? undefined : 560}
              />
            </div>
          )}
          {activeTab === 'json' && (
            <div style={{ width: '100%', height: fullscreen ? '100%' : undefined }}>
              <CodeEditor
                value={jsonDraftText}
                language="json"
                onChange={(v: string | undefined) => {
                  const next = v ?? ''
                  setJsonDraftText(next)
                  applyJson(next)
                }}
                minHeight={fullscreen ? 400 : 560}
                maxHeight={fullscreen ? undefined : 560}
              />
              {jsonError && <p style={{ color: 'var(--theme-error-500, #e5484d)', fontSize: 12, padding: '6px 4px' }}>Not applied yet — {jsonError}</p>}
            </div>
          )}
        </div>
      </div>
      {!fullscreen && (
        <p style={{ fontSize: 12, color: 'var(--theme-elevation-400, #999)', marginTop: 8 }}>
          The placeholder <code>{'{{ template "content" . }}'}</code> should appear exactly once in the template. Changes autosave every 20s, and a local
          crash-recovery copy is kept in your browser until you save.
        </p>
      )}
    </div>
  )
}

export default TemplateEditorField
