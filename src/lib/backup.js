// Export / import of all app data, as insurance against localStorage loss
// (cleared browser data, switching devices). The backup is a single JSON file.

const KEYS = [
  'wfd-places-v1',
  'wfd-history',
  'wfd-muted',
  'wfd-variety',
  'wfd-knockout',
  'wfd-round',
]

// Snapshot every known key into one portable object.
export function buildBackup() {
  const data = { app: 'whats-for-dinner', version: 1, exportedAt: new Date().toISOString() }
  for (const k of KEYS) {
    const raw = localStorage.getItem(k)
    if (raw == null) continue
    try {
      data[k] = JSON.parse(raw)
    } catch {
      // skip a corrupt entry rather than poisoning the backup
    }
  }
  return data
}

// Returns an error message, or null when the backup looks usable.
export function validateBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return 'That file isn’t a valid backup.'
  }
  if (data.app !== 'whats-for-dinner') {
    return 'That file isn’t a What’s for Dinner backup.'
  }
  const p = data['wfd-places-v1']
  if (!p || !Array.isArray(p.places) || p.places.length === 0) {
    return 'This backup contains no places.'
  }
  if (!p.places.every((x) => x && typeof x.name === 'string' && Array.isArray(x.foods))) {
    return 'This backup’s places look corrupted.'
  }
  if (data['wfd-history'] != null && !Array.isArray(data['wfd-history'])) {
    return 'This backup’s history looks corrupted.'
  }
  return null
}

// Write a validated backup over the stored state. The caller reloads afterwards
// so every piece of state rehydrates from storage in one consistent step.
export function applyBackup(data) {
  for (const k of KEYS) {
    if (k in data) localStorage.setItem(k, JSON.stringify(data[k]))
  }
}
