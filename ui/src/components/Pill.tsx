import type { CSSProperties, ReactNode } from 'react'

interface PillProps {
  children: ReactNode
  color?: string
}

export function Pill({ children, color = 'var(--accent)' }: PillProps) {
  const style: CSSProperties = {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 'var(--radius-pill)',
    background: `${color}22`,
    color,
    fontSize: 12,
    fontWeight: 700,
  }
  return <span style={style}>{children}</span>
}
