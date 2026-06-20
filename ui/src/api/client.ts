import type { Commit, FileEntry, Transfer, TradeDevice } from '../types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init)
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    throw new Error(`${r.status} ${r.statusText}${body ? `: ${body}` : ''}`)
  }
  return r.json() as Promise<T>
}

export const api = {
  files(): Promise<FileEntry[]> {
    return request<FileEntry[]>('/api/files')
  },

  history(path: string): Promise<Commit[]> {
    return request<Commit[]>(`/api/history/${path}`)
  },

  restore(path: string, hash: string): Promise<{ status: string, path: string, hash: string }> {
    return request(`/api/restore/${path}?hash=${encodeURIComponent(hash)}`, { method: 'POST' })
  },

  pullUrl(path: string): string {
    return `/api/pull/${path}`
  },

  trade: {
    devices(): Promise<TradeDevice[]> {
      return request<TradeDevice[]>('/api/trade/devices')
    },

    transfers(): Promise<Transfer[]> {
      return request<Transfer[]>('/api/trade/transfers')
    },

    transfer(fromDevice: string, toDevice: string, romPath: string): Promise<Transfer> {
      return request<Transfer>('/api/trade/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_device: fromDevice, to_device: toDevice, rom_path: romPath }),
      })
    },
  },
}
