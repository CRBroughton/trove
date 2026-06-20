export interface FileEntry {
  path: string
  size: number
  mod_time: string
}

export interface Commit {
  hash: string
  message: string
  date: string
  author: string
}

export interface ROMEntry {
  name: string
  path: string
  size: number
}

export interface TradeDevice {
  name: string
  roms: ROMEntry[]
  last_seen: string
}

export interface Transfer {
  id: string
  from_device: string
  to_device: string
  rom_path: string
  state: 'pending_upload' | 'ready' | 'done'
  created_at: string
}

export interface PendingWork {
  uploads: Array<{ id: string, rom_path: string, peer: string }>
  downloads: Array<{ id: string, rom_path: string, peer: string }>
}
