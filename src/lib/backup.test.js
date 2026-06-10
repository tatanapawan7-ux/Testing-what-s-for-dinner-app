import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildBackup, validateBackup, applyBackup } from './backup'

function stubStorage(initial = {}) {
  const store = new Map(Object.entries(initial))
  vi.stubGlobal('localStorage', {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  })
  return store
}

const goodPlaces = {
  activePlaceId: 'p1',
  places: [{ id: 'p1', name: 'Home', emoji: '🏠', coords: null, foods: [] }],
}

beforeEach(() => stubStorage())

describe('buildBackup', () => {
  it('snapshots known keys and tags the file', () => {
    stubStorage({
      'wfd-places-v1': JSON.stringify(goodPlaces),
      'wfd-history': JSON.stringify([{ id: 'h1' }]),
      'wfd-muted': 'true',
      'unrelated-key': '"ignored"',
    })
    const b = buildBackup()
    expect(b.app).toBe('whats-for-dinner')
    expect(b.version).toBe(1)
    expect(b['wfd-places-v1']).toEqual(goodPlaces)
    expect(b['wfd-history']).toEqual([{ id: 'h1' }])
    expect(b['wfd-muted']).toBe(true)
    expect(b['unrelated-key']).toBeUndefined()
  })

  it('skips corrupt entries instead of throwing', () => {
    stubStorage({ 'wfd-history': '{broken' })
    expect(buildBackup()['wfd-history']).toBeUndefined()
  })
})

describe('validateBackup', () => {
  it('accepts a well-formed backup', () => {
    expect(validateBackup({ app: 'whats-for-dinner', 'wfd-places-v1': goodPlaces })).toBeNull()
  })

  it('rejects non-objects and foreign files', () => {
    expect(validateBackup(null)).toMatch(/valid backup/)
    expect(validateBackup([1, 2])).toMatch(/valid backup/)
    expect(validateBackup({ app: 'other-app' })).toMatch(/isn’t a What’s for Dinner/)
  })

  it('rejects backups without places or with corrupted shapes', () => {
    expect(validateBackup({ app: 'whats-for-dinner' })).toMatch(/no places/)
    expect(
      validateBackup({
        app: 'whats-for-dinner',
        'wfd-places-v1': { places: [{ name: 'X' }] }, // foods missing
      }),
    ).toMatch(/corrupted/)
    expect(
      validateBackup({
        app: 'whats-for-dinner',
        'wfd-places-v1': goodPlaces,
        'wfd-history': 'not-an-array',
      }),
    ).toMatch(/history/)
  })
})

describe('applyBackup', () => {
  it('round-trips through build → apply', () => {
    const store = stubStorage({
      'wfd-places-v1': JSON.stringify(goodPlaces),
      'wfd-variety': 'false',
    })
    const backup = buildBackup()
    store.clear()
    applyBackup(backup)
    expect(JSON.parse(store.get('wfd-places-v1'))).toEqual(goodPlaces)
    expect(store.get('wfd-variety')).toBe('false')
    expect(store.has('wfd-history')).toBe(false) // absent keys stay absent
  })
})
