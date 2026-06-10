// Geolocation math + nearby-restaurant search (OpenStreetMap).

export const GEO_RADIUS_M = 250 // how close you must be to auto-switch to a pinned place

// Haversine distance in metres between two { lat, lng } points.
export function distanceMeters(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Human-readable distance.
export function formatDistance(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

// Nearby eateries from OpenStreetMap via the keyless, CORS-friendly Overpass API
// (GET ?data= is a "simple" request — no preflight). Returns
// [{ name, cuisine|null, kind, lat, lng, dist }] sorted nearest-first; throws on
// network failure so the caller can show an error state.
export async function searchNearbyRestaurants(lat, lng, radius = 1600) {
  const query = `[out:json][timeout:20];
(
  node["amenity"~"^(restaurant|fast_food|cafe)$"](around:${radius},${lat},${lng});
  way["amenity"~"^(restaurant|fast_food|cafe)$"](around:${radius},${lat},${lng});
);
out center 60;`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 20000)
  try {
    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      { signal: ctrl.signal },
    )
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
    const data = await res.json()
    const seen = new Set()
    const results = []
    for (const el of data.elements ?? []) {
      const name = el.tags?.name
      const elat = el.lat ?? el.center?.lat
      const elng = el.lon ?? el.center?.lon
      if (!name || elat == null || elng == null) continue
      const key = name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      results.push({
        name,
        cuisine: el.tags.cuisine ? el.tags.cuisine.split(/[;,]/)[0].replace(/_/g, ' ') : null,
        kind: el.tags.amenity,
        lat: elat,
        lng: elng,
        dist: distanceMeters({ lat, lng }, { lat: elat, lng: elng }),
      })
    }
    results.sort((a, b) => a.dist - b.dist)
    return results
  } finally {
    clearTimeout(t)
  }
}
