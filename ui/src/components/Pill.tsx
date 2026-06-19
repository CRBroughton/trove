import type { CSSProperties } from 'react'

interface PillProps {
  children: React.ReactNode
  variant?: 'accent' | 'muted'
}

export function Pill({ children, variant = 'accent' }: PillProps) {
  const style: CSSProperties = variant === 'accent'
    ? {
        display: 'inline-block',
        padding: '3px 10px',
        background: 'var(--accent)',
        border: '1.5px solid var(--border)',
        color: '#0a0a0a',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.3,
      }
    : {
        display: 'inline-block',
        padding: '3px 10px',
        background: 'var(--surface2)',
        border: '1.5px solid var(--border)',
        color: 'var(--muted)',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.3,
      }

  return <span style={style}>{children}</span>
}
