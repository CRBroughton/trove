import type { FileEntry } from '../types'
import { api } from '../api/client'
import { fmtDate, fmtSize } from '../utils/format'

interface SaveRowProps {
  file: FileEntry
  selected: boolean
  accentColor: string
  onSelect: (file: FileEntry) => void
}

export function SaveRow({ file, selected, accentColor, onSelect }: SaveRowProps) {
  const name = file.path.split('/').pop() ?? file.path

  return (
    <div
      onClick={() => onSelect(file)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 'var(--radius-sm)',
        background: selected ? `${accentColor}30` : 'var(--surface)',
        border: `2px solid ${selected ? accentColor : '#e2dcff66'}`,
        boxShadow: selected ? `0 2px 12px ${accentColor}30` : 'var(--shadow)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.borderColor = 'var(--border)'
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.boxShadow = 'var(--shadow)'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.borderColor = '#e2dcff66'
        }
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700,
          color: selected ? 'var(--text)' : 'var(--text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        >
          {name}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 1 }}>{fmtDate(file.mod_time)}</div>
      </div>

      <span style={{ color: 'var(--muted)', fontSize: 13, flexShrink: 0 }}>{fmtSize(file.size)}</span>

      <a
        href={api.pullUrl(file.path)}
        download
        onClick={e => e.stopPropagation()}
        style={{
          flexShrink: 0,
          color: 'var(--accent)',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 700,
          background: 'var(--surface2)',
          border: '2px solid var(--border)',
          borderRadius: 'var(--radius-pill)',
          padding: '3px 12px',
          transition: 'all 0.15s',
        }}
        title="Download latest"
      >
        ↓
      </a>
    </div>
  )
}
