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

  useEffect(() => {
    void load()
  }, [load])

  const name = file.path.split('/').pop() ?? file.path

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: '2px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        background: 'var(--surface)',
        flexShrink: 0,
        borderRadius: '0 var(--radius) 0 0',
      }}
      >
        <div>
          <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: 17 }}>{name}</div>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{file.path}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Pill>{fmtSize(file.size)}</Pill>
            <Pill color="var(--muted)">
              modified
              {fmtDate(file.mod_time)}
            </Pill>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'var(--surface2)',
            border: '2px solid var(--border)',
            color: 'var(--muted)',
            borderRadius: 'var(--radius-pill)',
            padding: isMobile ? '6px 14px' : '0',
            width: isMobile ? 'auto' : 32,
            height: isMobile ? 'auto' : 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            fontSize: isMobile ? 13 : 14,
            cursor: 'pointer',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {isMobile ? '← back' : '✕'}
        </button>
      </div>

      <div style={{
        padding: '12px 20px',
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
            color: '#fff',
            textDecoration: 'none',
            padding: '8px 20px',
            borderRadius: 'var(--radius-pill)',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          ↓ download latest
        </a>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 800, letterSpacing: 1, marginBottom: 10 }}>
          HISTORY
        </div>

        {error && (
          <div style={{
            background: 'var(--danger)11',
            border: '2px solid var(--danger)33',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            color: 'var(--danger)',
            fontSize: 13,
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
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>No history yet.</div>
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
