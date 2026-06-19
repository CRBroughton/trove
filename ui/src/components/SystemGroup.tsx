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
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '4px 16px',
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
          color: '#0a0a0a',
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: 1.5,
          padding: '4px 14px',
          border: '2px solid #0a0a0a',
          textTransform: 'uppercase',
        }}
        >
          {system}
          <span style={{
            fontSize: 10,
            fontWeight: 900,
            display: 'inline-block',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform var(--transition)',
            lineHeight: 1,
          }}
          >
            ›
          </span>
        </span>
        <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
          {files.length}
          {' '}
          {files.length !== 1 ? 'SAVES' : 'SAVE'}
        </span>
      </button>

      <div style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        transition: 'grid-template-rows 0.2s ease',
      }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ padding: '6px 10px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
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
