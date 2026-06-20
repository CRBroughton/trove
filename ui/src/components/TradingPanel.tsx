import type { ROMEntry, TradeDevice, Transfer } from '../types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import { Modal } from './Modal'

const btnBase: React.CSSProperties = {
  background: 'var(--surface)',
  border: '2px solid var(--border)',
  color: 'var(--text)',
  fontFamily: 'var(--sans)',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: 'var(--shadow-sm)',
  transition: 'transform var(--transition), box-shadow var(--transition)',
  lineHeight: 1.2,
  letterSpacing: 0.5,
}

function pressIn(e: React.MouseEvent<HTMLElement>) {
  e.currentTarget.style.transform = 'translate(2px, 2px)'
  e.currentTarget.style.boxShadow = '0px 0px 0 var(--border)'
}

function pressOut(e: React.MouseEvent<HTMLElement>, shadow = 'var(--shadow-sm)') {
  e.currentTarget.style.transform = 'translate(0, 0)'
  e.currentTarget.style.boxShadow = shadow
}

interface Selected {
  device: string
  rom: ROMEntry
}

interface Toast {
  id: number
  message: string
  ok: boolean
}

export function TradingPanel() {
  const [devices, setDevices] = useState<TradeDevice[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [selected, setSelected] = useState<Selected | null>(null)
  const [pendingSend, setPendingSend] = useState<{ toDevice: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const addToast = useCallback((message: string, ok: boolean) => {
    const id = ++toastId.current
    setToasts(t => [...t, { id, message, ok }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  const poll = useCallback(async () => {
    try {
      const [devData, txData] = await Promise.all([api.trade.devices(), api.trade.transfers()])
      setDevices((devData ?? []).sort((a, b) => a.name.localeCompare(b.name)))
      setTransfers(txData ?? [])
    }
    catch {
      // silently ignore poll errors
    }
  }, [])

  useEffect(() => {
    void poll()
    const es = new EventSource('/api/trade/events')
    es.onmessage = () => void poll()
    es.onerror = () => { /* silently reconnect — browser handles it */ }
    return () => es.close()
  }, [poll])

  function requestSend(toDevice: string) {
    if (!selected || sending)
      return
    const target = devices.find(d => d.name === toDevice)
    const alreadyHas = target?.roms.some(r => r.path === selected.rom.path)
    if (alreadyHas) {
      setPendingSend({ toDevice })
      return
    }
    void executeSend(toDevice)
  }

  async function executeSend(toDevice: string) {
    if (!selected)
      return
    setSending(true)
    setPendingSend(null)
    try {
      await api.trade.transfer(selected.device, toDevice, selected.rom.path)
      setSelected(null)
      void poll()
    }
    catch (e) {
      addToast(e instanceof Error ? e.message : String(e), false)
    }
    finally {
      setSending(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024)
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    if (bytes >= 1024)
      return `${(bytes / 1024).toFixed(0)} KB`
    return `${bytes} B`
  }

  if (devices.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 40,
        textAlign: 'center',
      }}
      >
        <div style={{ fontSize: 56 }}>📡</div>
        <div style={{ fontWeight: 800, fontSize: 20 }}>NO DEVICES ONLINE</div>
        <div style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 320 }}>
          Run
          {' '}
          <code style={{ fontFamily: 'var(--mono)', background: 'var(--surface2)', padding: '1px 5px', border: '1px solid var(--border)' }}>sync.sh trade-announce</code>
          {' '}
          on your devices to make them visible here.
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden', position: 'relative' }}>
      {/* Status bar */}
      {selected && (
        <div style={{
          padding: '8px 16px',
          background: 'var(--accent)',
          border: '0 0 2px 0 solid var(--border)',
          borderBottom: '2px solid var(--border)',
          color: '#0a0a0a',
          fontWeight: 700,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
        >
          <span>SELECTED:</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{selected.rom.name}</span>
          <span style={{ color: '#0a0a0a88' }}>
            from
            {selected.device}
          </span>
          <div style={{ flex: 1 }} />
          <button
            style={{ ...btnBase, padding: '2px 10px', fontSize: 12, background: '#0a0a0a', color: 'var(--accent)', border: '2px solid #0a0a0a' }}
            onClick={() => setSelected(null)}
            onMouseEnter={pressIn}
            onMouseLeave={e => pressOut(e)}
          >
            CLEAR
          </button>
        </div>
      )}

      {/* Device grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: `repeat(${devices.length}, minmax(220px, 1fr))`,
        gap: 0,
        overflow: 'hidden',
      }}
      >
        {devices.map((device, i) => (
          <DeviceColumn
            key={device.name}
            device={device}
            selected={selected}
            sending={sending}
            isLast={i === devices.length - 1}
            onSelect={rom => setSelected(prev =>
              prev?.device === device.name && prev.rom.path === rom.path ? null : { device: device.name, rom },
            )}
            onSend={() => requestSend(device.name)}
            formatSize={formatSize}
          />
        ))}
      </div>

      {/* In Flight */}
      {transfers.length > 0 && (
        <div style={{
          flexShrink: 0,
          borderTop: '2px solid var(--border)',
          background: 'var(--surface2)',
          padding: '8px 19px 11px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
        >
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase' }}>In Flight</div>
          {transfers.map((t) => {
            const badgeBg = t.state === 'pending_upload'
              ? 'var(--warn)'
              : t.state === 'ready'
                ? 'var(--accent)'
                : '#22c55e'
            const statusLabel = t.state === 'pending_upload'
              ? 'UPLOADING...'
              : t.state === 'ready'
                ? 'DOWNLOADING...'
                : 'COMPLETE!'
            const actionLabel = t.state === 'pending_upload'
              ? `RUN TROVE TRADE ON ${t.from_device.toUpperCase()}`
              : t.state === 'ready'
                ? `RUN TROVE TRADE ON ${t.to_device.toUpperCase()}`
                : null
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                  {t.rom_path.split('/').pop()}
                </span>
                <span style={{ color: 'var(--muted)' }}>
                  {t.from_device}
                  {' '}
                  →
                  {' '}
                  {t.to_device}
                </span>
                <div style={{ flex: 1 }} />
                <div style={{
                  background: badgeBg,
                  color: '#0a0a0a',
                  fontWeight: 900,
                  fontSize: 13,
                  letterSpacing: 2,
                  padding: '5px 14px',
                  border: '2px solid #0a0a0a',
                  boxShadow: '3px 3px 0 #0a0a0a',
                }}
                >
                  {statusLabel}
                  {actionLabel && (
                    <span style={{ fontWeight: 700, letterSpacing: 0.5, marginLeft: 10, opacity: 0.75 }}>
                      —
                      {' '}
                      {actionLabel}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pendingSend && selected && (
        <Modal
          title="ROM ALREADY EXISTS"
          message={`${pendingSend.toDevice} already has ${selected.rom.name}. Send anyway and overwrite?`}
          confirmLabel="SEND ANYWAY"
          cancelLabel="CANCEL"
          onConfirm={() => void executeSend(pendingSend.toDevice)}
          onCancel={() => setPendingSend(null)}
        />
      )}

      {/* Error toasts only */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              padding: '10px 16px',
              background: 'var(--danger)',
              color: '#ffffff',
              border: '2px solid var(--border)',
              boxShadow: 'var(--shadow)',
              fontWeight: 700,
              fontSize: 13,
              animation: 'fadeIn 0.15s ease',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}

interface DeviceColumnProps {
  device: TradeDevice
  selected: Selected | null
  sending: boolean
  isLast: boolean
  onSelect: (rom: ROMEntry) => void
  onSend: () => void
  formatSize: (bytes: number) => string
}

function DeviceColumn({ device, selected, sending, isLast, onSelect, onSend, formatSize }: DeviceColumnProps) {
  const isSource = selected?.device === device.name
  const canReceive = selected !== null && !isSource

  const lastSeen = new Date(device.last_seen)
  const secsAgo = Math.round((Date.now() - lastSeen.getTime()) / 1000)
  const presence = secsAgo < 60 ? `${secsAgo}s ago` : `${Math.round(secsAgo / 60)}m ago`

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      borderRight: isLast ? 'none' : '2px solid var(--border)',
      overflow: 'hidden',
    }}
    >
      {/* Device header */}
      <div style={{
        padding: '10px 14px',
        background: isSource ? 'var(--accent)' : 'var(--surface2)',
        borderBottom: '2px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}
      >
        <div style={{
          fontWeight: 900,
          fontSize: 13,
          letterSpacing: 1,
          color: isSource ? '#0a0a0a' : 'var(--text)',
          textTransform: 'uppercase',
          flex: 1,
        }}
        >
          {device.name}
        </div>
        <div style={{ fontSize: 11, color: isSource ? '#0a0a0a99' : 'var(--muted)', fontFamily: 'var(--mono)' }}>
          {presence}
        </div>
        <div style={{
          width: 8,
          height: 8,
          background: secsAgo < 30 ? '#22c55e' : secsAgo < 120 ? '#f59e0b' : 'var(--muted)',
          border: '1px solid var(--border)',
          flexShrink: 0,
        }}
        />
      </div>

      {/* SEND button (shown when this device can receive) */}
      {canReceive && (
        <button
          disabled={sending}
          onClick={onSend}
          onMouseEnter={(e) => {
            if (!sending) {
              e.currentTarget.style.transform = 'translate(4px, 4px)'
              e.currentTarget.style.boxShadow = '0px 0px 0 var(--border)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)'
            e.currentTarget.style.boxShadow = '4px 4px 0px var(--border)'
          }}
          style={{
            ...btnBase,
            background: sending ? 'var(--surface2)' : 'var(--accent)',
            color: '#0a0a0a',
            border: '2px solid var(--border)',
            borderTop: 'none',
            borderBottom: '2px solid var(--border)',
            padding: '10px 14px',
            fontSize: 13,
            letterSpacing: 2,
            fontWeight: 900,
            boxShadow: '4px 4px 0px var(--border)',
            opacity: sending ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {sending ? 'SENDING…' : `⇒ SEND HERE`}
        </button>
      )}

      {/* ROM list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {device.roms.length === 0
          ? (
              <div style={{ padding: '20px 14px', color: 'var(--muted)', fontSize: 13, textAlign: 'center' }}>
                No ROMs found
              </div>
            )
          : device.roms.map((rom) => {
              const isSelected = selected?.device === device.name && selected.rom.path === rom.path
              return (
                <button
                  key={rom.path}
                  onClick={() => onSelect(rom)}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = 'var(--surface2)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      e.currentTarget.style.background = 'transparent'
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    padding: '8px 14px',
                    cursor: 'pointer',
                    color: isSelected ? '#0a0a0a' : 'var(--text)',
                    fontFamily: 'var(--sans)',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{rom.name}</div>
                  <div style={{ fontSize: 11, color: isSelected ? '#0a0a0a88' : 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                    {rom.path}
                    {' '}
                    ·
                    {formatSize(rom.size)}
                  </div>
                </button>
              )
            })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px 14px',
        borderTop: '2px solid var(--border)',
        background: 'var(--surface2)',
        fontSize: 11,
        color: 'var(--muted)',
        fontWeight: 600,
        flexShrink: 0,
      }}
      >
        {device.roms.length}
        {' '}
        ROM
        {device.roms.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
