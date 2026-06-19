import type { FileEntry } from '../types'
import { api } from '../api/client'
import { fmtDate, fmtSize } from '../utils/format'

interface SaveRowProps {
  file: FileEntry
  selected: boolean
  accentColor: string
  onSelect: (file: FileEntry) => void
}

export function SaveRow({ file, selected, onSelect }: SaveRowProps) {
  const name = file.path.split('/').pop() ?? file.path

  return (
    <div
      onClick={() => onSelect(file)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: selected ? 'var(--accent)' : 'var(--surface)',
        border: '2px solid var(--border)',
        boxShadow: selected ? 'none' : 'var(--shadow-sm)',
        transform: selected ? 'translate(2px, 2px)' : 'translate(0, 0)',
        cursor: 'pointer',
        transition: 'transform var(--transition), box-shadow var(--transition), background var(--transition)',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.transform = 'translate(2px, 2px)'
          e.currentTarget.style.boxShadow = '0px 0px 0 var(--border)'
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.transform = 'translate(0, 0)'
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        }
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--sans)',
          fontWeight: 800,
          color: selected ? '#0a0a0a' : 'var(--text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontSize: 14,
          letterSpacing: 0.3,
        }}
        >
          {name}
        </div>
        <div style={{ color: selected ? '#0a0a0a' : 'var(--muted)', fontSize: 12, marginTop: 1, opacity: selected ? 0.7 : 1 }}>
          {fmtDate(file.mod_time)}
        </div>
      </div>

      <span style={{
        color: selected ? '#0a0a0a' : 'var(--muted)',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
        opacity: selected ? 0.7 : 1,
      }}
      >
        {fmtSize(file.size)}
      </span>

      <a
        href={api.pullUrl(file.path)}
        download
        onClick={e => e.stopPropagation()}
        style={{
          flexShrink: 0,
          color: '#0a0a0a',
          textDecoration: 'none',
          fontSize: 13,
          fontWeight: 800,
          background: 'var(--accent)',
          border: '2px solid #0a0a0a',
          padding: '4px 12px',
          boxShadow: '2px 2px 0 #0a0a0a',
          transition: 'transform var(--transition), box-shadow var(--transition)',
          lineHeight: 1.2,
        }}
        title="Download latest"
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translate(2px, 2px)'
          e.currentTarget.style.boxShadow = '0px 0px 0 #0a0a0a'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translate(0, 0)'
          e.currentTarget.style.boxShadow = '2px 2px 0 #0a0a0a'
        }}
      >
        ↓
      </a>
    </div>
  )
}
