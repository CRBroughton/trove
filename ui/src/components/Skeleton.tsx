function SkeletonLine({ width = '100%', height = 14 }: { width?: string | number, height?: number }) {
  return (
    <div style={{
      width,
      height,
      background: 'linear-gradient(90deg, var(--surface2) 25%, var(--surface) 50%, var(--surface2) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease-in-out infinite',
      border: '1px solid var(--border)',
    }}
    />
  )
}

export function SkeletonSaveRow() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      background: 'var(--surface)',
      border: '2px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
    }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <SkeletonLine width="55%" height={14} />
        <SkeletonLine width="35%" height={11} />
      </div>
      <SkeletonLine width={36} height={13} />
      <SkeletonLine width={34} height={30} />
    </div>
  )
}

export function SkeletonGroup({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ padding: '4px 16px', marginBottom: 6 }}>
        <SkeletonLine width={72} height={28} />
      </div>
      <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Array.from({ length: rows }, (_, i) => <SkeletonSaveRow key={i} />)}
      </div>
    </div>
  )
}

export function SkeletonCommit() {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      padding: '10px 14px',
      background: 'var(--surface2)',
      border: '2px solid var(--border)',
      marginBottom: 6,
    }}
    >
      <div style={{
        marginTop: 5,
        width: 10,
        height: 10,
        background: 'var(--surface)',
        border: '2px solid var(--border)',
        flexShrink: 0,
      }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <SkeletonLine width="40%" height={13} />
        <SkeletonLine width="68%" height={13} />
      </div>
    </div>
  )
}
