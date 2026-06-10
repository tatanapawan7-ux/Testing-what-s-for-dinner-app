// Food photo search & placeholders (no API key).
// Results are { id, thumb (grid preview), full (stored/display image), title }.

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0 // force 32-bit int
  }
  return Math.abs(hash)
}

// A guaranteed-to-render inline SVG, used whenever a remote photo fails to load
// (dead id, rate-limited/hotlinked thumbnail, offline) so the UI never shows a
// broken-image icon.
export function placeholderImage(name) {
  const safe = (name || 'Food').slice(0, 16).replace(/[<>&]/g, '')
  // Warm band (amber → terracotta) so placeholders fit the cream theme.
  const hue = 14 + (hashString(name || 'food') % 42)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},58%,52%)"/>` +
    `<stop offset="1" stop-color="hsl(${hue + 14},52%,38%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="400" fill="url(#g)"/>` +
    `<text x="200" y="215" font-family="system-ui,sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">${safe}</text>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// True when a stored image can't be used as-is and should be (re)fetched: empty,
// a non-string (older versions accidentally stored array indices), or a dead
// `images.unsplash.com` URL from a previous version.
export function needsImage(img) {
  return typeof img !== 'string' || img === '' || img.includes('images.unsplash.com')
}

// TheMealDB — real food photography for common dishes (CORS-enabled, hotlink-ok).
async function searchMealDb(query) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`,
      { signal: ctrl.signal },
    )
    if (!res.ok) throw new Error(`MealDB HTTP ${res.status}`)
    const data = await res.json()
    return (data.meals ?? [])
      .map((m) => ({
        id: `mdb-${m.idMeal}`,
        thumb: m.strMealThumb,
        full: m.strMealThumb,
        title: m.strMeal || query,
      }))
      .filter((r) => r.thumb)
  } finally {
    clearTimeout(t)
  }
}

// Openverse — Creative-Commons fallback covering anything TheMealDB lacks.
async function searchOpenverse(query, count) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(
      query,
    )}&page_size=${count}&mature=false`
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`Openverse HTTP ${res.status}`)
    const data = await res.json()
    return (data.results ?? [])
      .map((r) => {
        const url = r.thumbnail || r.url
        return { id: r.id, thumb: url, full: url, title: r.title || query }
      })
      .filter((r) => r.thumb)
  } finally {
    clearTimeout(t)
  }
}

// Merge TheMealDB (preferred) + Openverse. Throws only when BOTH fail (network),
// so callers can tell a true error from an empty result set.
export async function searchFoodImages(query, count = 8) {
  const [mdb, ov] = await Promise.allSettled([
    searchMealDb(query),
    searchOpenverse(query, count),
  ])
  if (mdb.status === 'rejected' && ov.status === 'rejected') {
    throw new Error('photo search failed')
  }
  const a = mdb.status === 'fulfilled' ? mdb.value : []
  const b = ov.status === 'fulfilled' ? ov.value : []
  const seen = new Set()
  const merged = []
  for (const r of [...a, ...b]) {
    if (!r.thumb || seen.has(r.thumb)) continue
    seen.add(r.thumb)
    merged.push(r)
    if (merged.length >= count) break
  }
  return merged
}
