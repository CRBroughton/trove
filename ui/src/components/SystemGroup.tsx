import type { FileEntry } from '../types'
import { useState } from 'react'
import { systemColor } from '../utils/format'
import { SaveRow } from './SaveRow'

interface SystemGroupProps {
  system: string
  files: FileEntry[]
  selected: FileEntry | null
  onSelect: (file: FileEntry) => void
}

export function SystemGroup({ system, files, selected, onSelect }: SystemGroupProps) {
  const [open, setOpen] = useState(true)
  const color = systemColor(system)

  return (
    <div style={{ marginBottom: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '6px 16px',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: color,
          color: '#3a3060',
          fontWeight: 800,
          fontSize: 13,
          letterSpacing: 1,
          padding: '4px 14px',
          borderRadius: 'var(--radius-pill)',
        }}
        >
          {system}
          <span style={{
            fontSize: 11,
            opacity: 0.7,
            fontWeight: 600,
          }}
          >
            {open ? '▾' : '▸'}
          </span>
        </span>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>
          {files.length}
          {' '}
          save
          {files.length !== 1 ? 's' : ''}
        </span>
      </button>

      <div style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.25s ease',
      }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ padding: '4px 8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {files.map(f => (
              <SaveRow
                key={f.path}
                file={f}
                selected={selected?.path === f.path}
                onSelect={onSelect}
                accentColor={color}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
