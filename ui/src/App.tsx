import type { FileEntry } from './types'
import { useCallback, useEffect, useState } from 'react'
import { api } from './api/client'
import { HistoryPanel } from './components/HistoryPanel'
import { SkeletonGroup } from './components/Skeleton'
import { SystemGroup } from './components/SystemGroup'
import { groupBySystem } from './utils/format'

export default function App() {
  const [files, setFiles] = useState<FileEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<FileEntry | null>(null)
  const [search, setSearch] = useState('')
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const load = useCallback(async () => {
    try {
      const data = await api.files()
      setFiles(data ?? [])
    }
    catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = files?.filter(f =>
    f.path.toLowerCase().includes(search.toLowerCase()),
  ) ?? []

  const grouped = groupBySystem(filtered)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 16, gap: 12 }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '12px 16px',
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        flexShrink: 0,
      }}
      >
        {/* Row 1: logo + count + buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'var(--accent)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: 2,
            padding: '5px 18px',
            borderRadius: 'var(--radius-pill)',
            flexShrink: 0,
          }}
          >
            TROVE
          </div>

          {!isMobile && (
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>
              {files ? `${files.length} saves` : '…'}
            </span>
          )}

          <div style={{ flex: 1 }} />

          <button
            onClick={() => { void load() }}
            style={{
              background: 'var(--surface2)',
              border: '2px solid var(--border)',
              color: 'var(--muted)',
              borderRadius: 'var(--radius-pill)',
              padding: isMobile ? '6px 12px' : '6px 16px',
              fontSize: isMobile ? 16 : 14,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
              lineHeight: 1,
            }}
            title="Refresh"
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {isMobile ? '↻' : '↻ refresh'}
          </button>

          <button
            onClick={() => setDark(d => !d)}
            style={{
              background: 'var(--surface2)',
              border: '2px solid var(--border)',
              color: 'var(--muted)',
              borderRadius: 'var(--radius-pill)',
              padding: '6px 12px',
              fontSize: 16,
              cursor: 'pointer',
              transition: 'all 0.15s',
              lineHeight: 1,
            }}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Row 2: search (full width) */}
        <input
          type="text"
          placeholder="🔍 filter saves…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--surface2)',
            border: '2px solid var(--border)',
            borderRadius: 'var(--radius-pill)',
            padding: '8px 18px',
            color: 'var(--text)',
            fontFamily: 'var(--sans)',
            fontSize: 14,
            fontWeight: 500,
            outline: 'none',
          }}
        />
      </header>

      {/* Main */}
      <div style={{ display: 'flex', flex: 1, gap: 12, overflow: 'hidden' }}>
        {/* File list — hidden on mobile when history panel is open */}
        <div style={{
          width: selected && !isMobile ? 340 : '100%',
          maxWidth: selected && !isMobile ? 340 : 'none',
          flexShrink: 0,
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          display: isMobile && selected ? 'none' : 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.2s',
        }}
        >
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {error && (
              <div style={{
                margin: 16,
                padding: '12px 16px',
                background: 'var(--danger)11',
                border: '2px solid var(--danger)33',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)',
                fontSize: 13,
              }}
              >
                Could not load saves:
                {' '}
                {error}
              </div>
            )}
            {!files && !error && (
              <div style={{ padding: '8px 0', animation: 'fadeIn 0.2s ease' }}>
                <SkeletonGroup rows={3} />
                <SkeletonGroup rows={2} />
                <SkeletonGroup rows={4} />
              </div>
            )}
            {files?.length === 0 && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🎮</div>
                <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 22 }}>No saves yet.</div>
                <div style={{ color: 'var(--muted)', fontSize: 15, marginTop: 6 }}>
                  Push a save from your Anbernic to get started.
                </div>
              </div>
            )}
            {files && files.length > 0 && filtered.length === 0 && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
                <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 22 }}>
                  No results for "
                  {search}
                  "
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 15, marginTop: 6 }}>
                  Try a different search term.
                </div>
              </div>
            )}
            {Object.entries(grouped).map(([sys, sysFiles]) => (
              <SystemGroup
                key={sys}
                system={sys}
                files={sysFiles}
                selected={selected}
                onSelect={f => setSelected(prev => prev?.path === f.path ? null : f)}
              />
            ))}
          </div>
        </div>

        {/* History panel */}
        {selected && (
          <div style={{
            flex: 1,
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: `${isMobile ? 'slideUp' : 'fadeSlideIn'} 0.22s ease`,
          }}
          >
            <HistoryPanel
              file={selected}
              isMobile={isMobile}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
