import type { Commit } from '../types'
import { useState } from 'react'
import { api } from '../api/client'
import { fmtDate, shortHash } from '../utils/format'

interface CommitLineProps {
  commit: Commit
  path: string
  isLatest: boolean
  onRestore: () => void
}

export function CommitLine({ commit, path, isLatest, onRestore }: CommitLineProps) {
  const [restoring, setRestoring] = useState(false)
  const [done, setDone] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  async function handleRestore() {
    if (isLatest)
      return
    setRestoring(true)
    setRestoreError(null)
    try {
      await api.restore(path, commit.hash)
      setDone(true)
      setTimeout(setDone, 2000, false)
      onRestore()
    }
    catch (e) {
      setRestoreError(e instanceof Error ? e.message : String(e))
    }
    finally {
      setRestoring(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      padding: '10px 14px',
      borderRadius: 'var(--radius-sm)',
      background: isLatest ? 'var(--accent)0d' : 'var(--surface2)',
      border: `2px solid ${isLatest ? 'var(--accent)33' : 'var(--border)'}`,
      marginBottom: 6,
    }}
    >
      <div style={{
        marginTop: 4,
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: isLatest ? 'var(--accent2)' : 'var(--border)',
        border: `2px solid ${isLatest ? 'var(--accent2)' : 'var(--muted)'}`,
        flexShrink: 0,
      }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <code style={{ fontFamily: 'var(--mono)', color: 'var(--accent)', fontSize: 13, fontWeight: 500 }}>
            {shortHash(commit.hash)}
          </code>
          {isLatest && (
            <span style={{
              background: 'var(--accent2)22',
              color: 'var(--accent2)',
              fontSize: 11,
              fontWeight: 800,
              padding: '1px 8px',
              borderRadius: 'var(--radius-pill)',
            }}
            >
              latest
            </span>
          )}
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{fmtDate(commit.date)}</span>
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{commit.message}</div>
        {restoreError && (
          <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{restoreError}</div>
        )}
      </div>

      {!isLatest && (
        <button
          onClick={handleRestore}
          disabled={restoring}
          style={{
            flexShrink: 0,
            background: done ? 'var(--accent2)22' : 'var(--surface)',
            border: `2px solid ${done ? 'var(--accent2)' : 'var(--border)'}`,
            color: done ? 'var(--accent2)' : 'var(--muted)',
            borderRadius: 'var(--radius-pill)',
            padding: '4px 14px',
            fontSize: 13,
            fontWeight: 700,
            cursor: restoring ? 'wait' : 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (!done) {
              e.currentTarget.style.borderColor = 'var(--danger)'
              e.currentTarget.style.color = 'var(--danger)'
            }
          }}
          onMouseLeave={(e) => {
            if (!done) {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--muted)'
            }
          }}
        >
          {done ? '✓ restored' : restoring ? 'restoring…' : 'restore'}
        </button>
      )}
    </div>
  )
}
