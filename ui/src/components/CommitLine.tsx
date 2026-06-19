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

const stripe = 'repeating-linear-gradient(-45deg, #FFE03A 0, #FFE03A 5px, #0a0a0a 5px, #0a0a0a 7px)'

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
      background: isLatest ? 'var(--accent)' : 'var(--surface2)',
      border: '2px solid var(--border)',
      marginBottom: 6,
    }}
    >
      <div style={{
        marginTop: 6,
        width: 10,
        height: 10,
        flexShrink: 0,
        background: isLatest ? '#0a0a0a' : 'var(--surface)',
        border: '2px solid var(--border)',
      }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <code style={{ fontFamily: 'var(--mono)', color: isLatest ? '#0a0a0a' : 'var(--text)', fontSize: 13, fontWeight: 700 }}>
            {shortHash(commit.hash)}
          </code>
          {isLatest && (
            <span style={{
              background: stripe,
              color: '#0a0a0a',
              fontSize: 10,
              fontWeight: 900,
              padding: '2px 8px',
              border: '1.5px solid #0a0a0a',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
            >
              LATEST
            </span>
          )}
          <span style={{ color: isLatest ? '#0a0a0a' : 'var(--muted)', fontSize: 12, opacity: isLatest ? 0.7 : 1 }}>
            {fmtDate(commit.date)}
          </span>
        </div>
        <div style={{ color: isLatest ? '#0a0a0a' : 'var(--muted)', fontSize: 13, marginTop: 2 }}>
          {commit.message}
        </div>
        {restoreError && (
          <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4, fontWeight: 700 }}>{restoreError}</div>
        )}
      </div>

      {!isLatest && (
        <button
          onClick={handleRestore}
          disabled={restoring}
          style={{
            flexShrink: 0,
            background: done ? 'var(--accent)' : 'var(--surface)',
            border: '2px solid var(--border)',
            color: done ? '#0a0a0a' : 'var(--muted)',
            padding: '4px 14px',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.5,
            cursor: restoring ? 'wait' : 'pointer',
            boxShadow: done ? 'none' : 'var(--shadow-sm)',
            transform: done ? 'translate(2px, 2px)' : 'translate(0, 0)',
            transition: 'transform var(--transition), box-shadow var(--transition), background var(--transition), color var(--transition)',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
          }}
          onMouseEnter={(e) => {
            if (!done && !restoring) {
              e.currentTarget.style.background = 'var(--accent)'
              e.currentTarget.style.color = '#0a0a0a'
              e.currentTarget.style.transform = 'translate(2px, 2px)'
              e.currentTarget.style.boxShadow = '0px 0px 0 var(--border)'
            }
          }}
          onMouseLeave={(e) => {
            if (!done && !restoring) {
              e.currentTarget.style.background = 'var(--surface)'
              e.currentTarget.style.color = 'var(--muted)'
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
            }
          }}
        >
          {done ? '✓ RESTORED' : restoring ? 'RESTORING…' : 'RESTORE'}
        </button>
      )}
    </div>
  )
}
