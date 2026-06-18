import type { FileEntry } from '../types'
import { describe, expect, it } from 'vitest'
import { fmtSize, groupBySystem, shortHash, systemOf } from './format'

describe('fmtSize', () => {
  it('formats bytes under 1 KB', () => {
    expect(fmtSize(0)).toBe('0B')
    expect(fmtSize(512)).toBe('512B')
    expect(fmtSize(1023)).toBe('1023B')
  })

  it('formats kilobytes', () => {
    expect(fmtSize(1024)).toBe('1.0KB')
    expect(fmtSize(2048)).toBe('2.0KB')
    expect(fmtSize(1536)).toBe('1.5KB')
  })

  it('formats megabytes', () => {
    expect(fmtSize(1024 * 1024)).toBe('1.00MB')
    expect(fmtSize(1024 * 1024 * 2.5)).toBe('2.50MB')
  })
})

describe('shortHash', () => {
  it('returns first 7 chars', () => {
    expect(shortHash('abc1234def5678')).toBe('abc1234')
  })

  it('handles exactly 7 chars', () => {
    expect(shortHash('abc1234')).toBe('abc1234')
  })

  it('handles short hash without crashing', () => {
    expect(shortHash('abc')).toBe('abc')
  })
})

describe('systemOf', () => {
  it('extracts system prefix in uppercase', () => {
    expect(systemOf('gba/pokemon.srm')).toBe('GBA')
    expect(systemOf('snes/super-metroid.srm')).toBe('SNES')
    expect(systemOf('gbc/links-awakening.sav')).toBe('GBC')
  })

  it('returns ROOT for flat paths', () => {
    expect(systemOf('pokemon.srm')).toBe('ROOT')
  })

  it('handles leading slash-like edge cases', () => {
    expect(systemOf('/pokemon.srm')).toBe('ROOT')
  })
})

describe('groupBySystem', () => {
  const files: FileEntry[] = [
    { path: 'gba/a.srm', size: 1, mod_time: '' },
    { path: 'gba/b.srm', size: 2, mod_time: '' },
    { path: 'snes/c.srm', size: 3, mod_time: '' },
    { path: 'root.srm', size: 4, mod_time: '' },
  ]

  it('groups files by system prefix', () => {
    const groups = groupBySystem(files)
    expect(groups.GBA).toHaveLength(2)
    expect(groups.SNES).toHaveLength(1)
    expect(groups.ROOT).toHaveLength(1)
  })

  it('preserves file order within group', () => {
    const groups = groupBySystem(files)
    expect(groups.GBA[0].path).toBe('gba/a.srm')
    expect(groups.GBA[1].path).toBe('gba/b.srm')
  })

  it('returns empty object for empty input', () => {
    expect(groupBySystem([])).toEqual({})
  })
})
