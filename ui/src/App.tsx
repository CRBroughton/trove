import type { FileEntry } from './types'
import { useCallback, useEffect, useState } from 'react'
import { api } from './api/client'
import { HistoryPanel } from './components/HistoryPanel'
import { SkeletonGroup } from './components/Skeleton'
import { SystemGroup } from './components/SystemGroup'
import { groupBySystem } from './utils/format'

const btnBase: React.CSSProperties = {
  background: 'var(--surface)',
  border: '2px solid var(--border)',
  color: 'var(--text)',
  fontFamily: 'var(--sans)',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: 'var(--shadow-sm)',
  transition: 'transform var(--transition), box-shadow var(--transition)',
  lineHeight: 1.2,
  letterSpacing: 0.5,
}

function pressBtnIn(e: React.MouseEvent<HTMLElement>) {
  e.currentTarget.style.transform = 'translate(2px, 2px)'
  e.currentTarget.style.boxShadow = '0px 0px 0 var(--border)'
}

function pressBtnOut(e: React.MouseEvent<HTMLElement>) {
  e.currentTarget.style.transform = 'translate(0, 0)'
  e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
}

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

  useEffect(() => { void load() }, [load])

  const filtered = files?.filter(f =>
    f.path.toLowerCase().includes(search.toLowerCase()),
  ) ?? []

  const grouped = groupBySystem(filtered)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 20, gap: 16 }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 18px',
        background: 'var(--surface)',
        border: '2px solid var(--border)',
        boxShadow: 'var(--shadow)',
        flexShrink: 0,
      }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'var(--accent)',
            color: '#0a0a0a',
            fontWeight: 900,
            fontSize: 14,
            letterSpacing: 3,
            padding: '6px 18px',
            border: '2px solid #0a0a0a',
            boxShadow: '3px 3px 0 #0a0a0a',
            flexShrink: 0,
          }}
          >
            TROVE
          </div>

          {!isMobile && (
            <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>
              {files ? `${files.length} saves` : '…'}
            </span>
          )}

          <div style={{ flex: 1 }} />

          <button
            onClick={() => { void load() }}
            style={{
              ...btnBase,
              padding: isMobile ? '6px 12px' : '6px 16px',
              fontSize: isMobile ? 16 : 13,
            }}
            title="Refresh"
            onMouseEnter={pressBtnIn}
            onMouseLeave={pressBtnOut}
          >
            {isMobile ? '↻' : '↻ REFRESH'}
          </button>

          <button
            onClick={() => setDark(d => !d)}
            style={{ ...btnBase, padding: '6px 12px', fontSize: 16 }}
            title={dark ? 'Light mode' : 'Dark mode'}
            onMouseEnter={pressBtnIn}
            onMouseLeave={pressBtnOut}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>

        <input
          type="text"
          placeholder="Filter saves…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={e => {
            e.currentTarget.style.boxShadow = '4px 4px 0 var(--accent)'
          }}
          onBlur={e => {
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
          }}
          style={{
            width: '100%',
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            padding: '10px 18px',
            color: 'var(--text)',
            fontFamily: 'var(--sans)',
            fontSize: 14,
            fontWeight: 600,
            outline: 'none',
            boxShadow: 'var(--shadow-sm)',
            transition: 'box-shadow var(--transition)',
          }}
        />
      </header>

      {/* Main */}
      <div style={{ display: 'flex', flex: 1, gap: 16, overflow: 'hidden' }}>
        {/* File list */}
        <div style={{
          width: selected && !isMobile ? 340 : '100%',
          maxWidth: selected && !isMobile ? 340 : 'none',
          flexShrink: 0,
          background: 'var(--surface)',
          border: '2px solid var(--border)',
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
                background: 'var(--surface2)',
                border: '2px solid var(--danger)',
                color: 'var(--danger)',
                fontSize: 13,
                fontWeight: 700,
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
                <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 20 }}>NO SAVES YET</div>
                <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
                  Push a save from your Anbernic to get started.
                </div>
              </div>
            )}
            {files && files.length > 0 && filtered.length === 0 && (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>—</div>
                <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: 20 }}>
                  NO RESULTS FOR "
                  {search.toUpperCase()}
                  "
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 6 }}>
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
            border: '2px solid var(--border)',
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: `${isMobile ? 'slideUp' : 'fadeSlideIn'} 0.18s ease`,
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
