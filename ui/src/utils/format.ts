import type { FileEntry } from '../types'

export function fmtSize(bytes: number): string {
  if (bytes < 1024)
    return `${bytes}B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`
}

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function shortHash(hash: string): string {
  return hash.slice(0, 7)
}

/** Extract the system prefix from a save path, e.g. "gba/pokemon.srm" → "GBA". */
export function systemOf(path: string): string {
  const slash = path.indexOf('/')
  return slash > 0 ? path.slice(0, slash).toUpperCase() : 'ROOT'
}

const SYSTEM_COLORS: Record<string, string> = {
  GBA: '#fda4af',
  GBC: '#86efac',
  SNES: '#c4b5fd',
  N64: '#93c5fd',
  PSX: '#cbd5e1',
  NDS: '#fcd34d',
  PCE: '#fdba74',
  NES: '#fca5a5',
  GB: '#a7f3d0',
  MAME: '#f9a8d4',
}

export function systemColor(system: string): string {
  return SYSTEM_COLORS[system.toUpperCase()] ?? '#d8b4fe'
}

export function groupBySystem(files: FileEntry[]): Record<string, FileEntry[]> {
  return files.reduce<Record<string, FileEntry[]>>((acc, f) => {
    const sys = systemOf(f.path)
    if (!acc[sys])
      acc[sys] = []
    acc[sys].push(f)
    return acc
  }, {})
}
