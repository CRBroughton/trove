interface ModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function Modal({ title, message, confirmLabel = 'CONFIRM', cancelLabel = 'CANCEL', onConfirm, onCancel }: ModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 10, 10, 0.6)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        animation: 'fadeIn 0.12s ease',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          boxShadow: '6px 6px 0 var(--border)',
          padding: '24px 28px',
          maxWidth: 400,
          width: '90%',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: 1 }}>{title}</div>
        <div style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              background: 'var(--surface)',
              border: '2px solid var(--border)',
              color: 'var(--text)',
              fontFamily: 'var(--sans)',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: 1,
              padding: '7px 18px',
              cursor: 'pointer',
              boxShadow: '3px 3px 0 var(--border)',
              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(2px, 2px)'
              e.currentTarget.style.boxShadow = '0px 0px 0 var(--border)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = '3px 3px 0 var(--border)'
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: 'var(--accent)',
              border: '2px solid var(--border)',
              color: '#0a0a0a',
              fontFamily: 'var(--sans)',
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: 1,
              padding: '7px 18px',
              cursor: 'pointer',
              boxShadow: '3px 3px 0 var(--border)',
              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(2px, 2px)'
              e.currentTarget.style.boxShadow = '0px 0px 0 var(--border)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = '3px 3px 0 var(--border)'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
