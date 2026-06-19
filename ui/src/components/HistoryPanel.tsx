import type { Commit, FileEntry } from '../types'
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { fmtDate, fmtSize } from '../utils/format'
import { CommitLine } from './CommitLine'
import { Pill } from './Pill'
import { SkeletonCommit } from './Skeleton'

interface HistoryPanelProps {
  file: FileEntry
  isMobile?: boolean
  onClose: () => void
}

export function HistoryPanel({ file, isMobile = false, onClose }: HistoryPanelProps) {
  const [commits, setCommits] = useState<Commit[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setCommits(null)
    setError(null)
    try {
      const data = await api.history(file.path)
      setCommits(data ?? [])
    }
    catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [file.path])

  useEffect(() => { void load() }, [load])

  const name = file.path.split('/').pop() ?? file.path

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: '2px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        background: 'var(--surface)',
        flexShrink: 0,
      }}
      >
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 16, letterSpacing: 0.5 }}>{name}</div>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2, fontFamily: 'var(--mono)' }}>{file.path}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <Pill>{fmtSize(file.size)}</Pill>
            <Pill variant="muted">
              {fmtDate(file.mod_time)}
            </Pill>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            color: 'var(--text)',
            fontFamily: 'var(--sans)',
            fontWeight: 700,
            padding: isMobile ? '6px 16px' : '6px 12px',
            fontSize: isMobile ? 13 : 14,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'transform var(--transition), box-shadow var(--transition)',
            flexShrink: 0,
            letterSpacing: 0.5,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translate(2px, 2px)'
            e.currentTarget.style.boxShadow = '0px 0px 0 var(--border)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)'
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
          }}
        >
          {isMobile ? '← BACK' : '✕'}
        </button>
      </div>

      {/* Download */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '2px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}
      >
        <a
          href={api.pullUrl(file.path)}
          download
          style={{
            display: 'inline-block',
            background: 'var(--accent)',
            color: '#0a0a0a',
            textDecoration: 'none',
            padding: '10px 24px',
            border: '2px solid #0a0a0a',
            boxShadow: 'var(--shadow)',
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: 'uppercase',
            transition: 'transform var(--transition), box-shadow var(--transition)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translate(4px, 4px)'
            e.currentTarget.style.boxShadow = '0px 0px 0 #0a0a0a'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)'
            e.currentTarget.style.boxShadow = 'var(--shadow)'
          }}
        >
          ↓ Download Latest
        </a>
      </div>

      {/* History list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{
          color: 'var(--muted)',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 2,
          marginBottom: 12,
          textTransform: 'uppercase',
          borderBottom: '2px solid var(--border)',
          paddingBottom: 8,
        }}
        >
          History
        </div>

        {error && (
          <div style={{
            background: 'var(--surface2)',
            border: '2px solid var(--danger)',
            padding: '10px 14px',
            color: 'var(--danger)',
            fontSize: 13,
            fontWeight: 700,
          }}
          >
            {error}
          </div>
        )}
        {!commits && !error && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {Array.from({ length: 4 }, (_, i) => <SkeletonCommit key={i} />)}
          </div>
        )}
        {commits?.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 700 }}>No history yet.</div>
        )}
        {commits?.map((c, i) => (
          <CommitLine
            key={c.hash}
            commit={c}
            path={file.path}
            isLatest={i === 0}
            onRestore={load}
          />
        ))}
      </div>
    </div>
  )
}
