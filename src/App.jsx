import { useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'

/* -------------------------------------------------------------------------- */
/*  Food photography                                                          */
/* -------------------------------------------------------------------------- */
// Curated, high-quality Unsplash photo IDs for common foods. Picking by
// keyword keeps the imagery crisp and relevant. Unknown foods fall back to a
// rotating pool of appetizing shots (varied with an `&sig=` cache-buster).
const FOOD_PHOTO_IDS = {
  pizza: 'photo-1513104890138-7c749659a591',
  sushi: 'photo-1579871494447-9811cf80d66c',
  burger: 'photo-1568901346375-23c9450c58cd',
  burgers: 'photo-1568901346375-23c9450c58cd',
  taco: 'photo-1565299624946-b28f40a0ae38',
  tacos: 'photo-1565299624946-b28f40a0ae38',
  thai: 'photo-1559314809-0d155014e29e',
  pasta: 'photo-1551183053-bf91a1d81141',
  spaghetti: 'photo-1551183053-bf91a1d81141',
  salad: 'photo-1512621776951-a57141f2eefd',
  ramen: 'photo-1569718212165-3a8278d5f624',
  steak: 'photo-1546964124-0cce460f38ef',
  curry: 'photo-1455619452474-d2be8b1e70cd',
  indian: 'photo-1455619452474-d2be8b1e70cd',
  sandwich: 'photo-1528735602780-2552fd46c7af',
  pancakes: 'photo-1567620905732-2d1ec7ab7445',
  breakfast: 'photo-1567620905732-2d1ec7ab7445',
  noodles: 'photo-1612929633738-8fe44f7ec841',
  chicken: 'photo-1604908176997-125f25cc6f3d',
  fried: 'photo-1604908176997-125f25cc6f3d',
  bbq: 'photo-1529193591184-b1d58069ecdd',
  barbecue: 'photo-1529193591184-b1d58069ecdd',
  dumplings: 'photo-1496116218417-1a781b1c416c',
  chinese: 'photo-1525755662778-989d0524087e',
  mexican: 'photo-1565299624946-b28f40a0ae38',
  seafood: 'photo-1559339352-11d035aa65de',
  fish: 'photo-1559339352-11d035aa65de',
  soup: 'photo-1547592180-85f173990554',
  dessert: 'photo-1551024601-bec78aea704b',
  cake: 'photo-1578985545062-69928b1d9587',
  vegan: 'photo-1512621776951-a57141f2eefd',
  vegetarian: 'photo-1512621776951-a57141f2eefd',
  korean: 'photo-1590301157890-4810ed352733',
  italian: 'photo-1513104890138-7c749659a591',
  japanese: 'photo-1579871494447-9811cf80d66c',
}

// Generic, always-appetizing fallbacks for unrecognised keywords.
const FALLBACK_PHOTO_IDS = [
  'photo-1504674900247-0877df9cc836',
  'photo-1476224203421-9ac39bcb3327',
  'photo-1493770348161-369560ae357d',
  'photo-1414235077428-338989a2e8c0',
  'photo-1540189549336-e6e99c3679fe',
]

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0 // force 32-bit int
  }
  return Math.abs(hash)
}

// Build an optimized Unsplash URL for a given food name + keyword match.
function imageForFood(name, size = 500) {
  const key = name.trim().toLowerCase().replace(/\s+/g, '')
  const words = name.trim().toLowerCase().split(/\s+/)

  let photoId = FOOD_PHOTO_IDS[key]
  if (!photoId) {
    // Try matching any single word in the name against the keyword map.
    const matchWord = words.find((w) => FOOD_PHOTO_IDS[w])
    photoId = matchWord ? FOOD_PHOTO_IDS[matchWord] : null
  }

  const hash = hashString(key || name)
  if (!photoId) {
    photoId = FALLBACK_PHOTO_IDS[hash % FALLBACK_PHOTO_IDS.length]
  }

  // `sig` keeps fallbacks visually distinct without breaking the CDN cache.
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${size}&q=80&sig=${hash % 1000}`
}

// A guaranteed-to-render inline SVG, used whenever a remote photo fails to load
// (dead id, rate-limited/hotlinked thumbnail, offline) so the UI never shows a
// broken-image icon.
function placeholderImage(name) {
  const safe = (name || 'Food').slice(0, 16).replace(/[<>&]/g, '')
  const hue = hashString(name || 'food') % 360
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},60%,45%)"/>` +
    `<stop offset="1" stop-color="hsl(${(hue + 35) % 360},60%,32%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="400" fill="url(#g)"/>` +
    `<text x="200" y="215" font-family="system-ui,sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">${safe}</text>` +
    `</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

// Food <img> that falls back to a placeholder on error and avoids hotlink
// blocks via a no-referrer policy.
function FoodImage({ name, src, className }) {
  return (
    <img
      src={src || placeholderImage(name)}
      alt={name}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={className}
      onError={(e) => {
        if (e.currentTarget.dataset.fb) return
        e.currentTarget.dataset.fb = '1'
        e.currentTarget.src = placeholderImage(name)
      }}
    />
  )
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function makeFood(name, image) {
  const clean = name.trim()
  return { id: uid('food'), name: clean, image: image || imageForFood(clean) }
}

// Search Openverse (Creative-Commons image search, no API key) for ~6 photos
// matching a food name, so the user can pick the one that actually looks right.
// Returns [{ id, thumb, title }]; throws on network/HTTP errors so the caller
// can fall back to imageForFood().
async function searchFoodImages(query, count = 6) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(
      query,
    )}&page_size=${count}&mature=false`
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Openverse HTTP ${res.status}`)
    const data = await res.json()
    return (data.results ?? [])
      .map((r) => ({ id: r.id, thumb: r.thumbnail || r.url, title: r.title || query }))
      .filter((r) => r.thumb)
  } finally {
    clearTimeout(timer)
  }
}

/* -------------------------------------------------------------------------- */
/*  Places (location profiles)                                                */
/* -------------------------------------------------------------------------- */
// A "place" is a named location with its own food list and an optional pinned
// GPS coordinate used for the "use my location" auto-switch.
function makePlace(name, emoji, foodNames = []) {
  return {
    id: uid('place'),
    name: name.trim(),
    emoji,
    coords: null, // { lat, lng } once the user pins it
    foods: foodNames.map(makeFood),
  }
}

const EMOJI_CHOICES = ['🏠', '🛍️', '💼', '🏖️', '✈️', '🎬', '🏟️', '🏞️', '🎓', '☕', '🍽️', '🎉']

// Build the initial places, migrating any pre-existing flat `wfd-foods` list
// into a "Home" place so returning users keep their menu.
function bootstrapPlaces() {
  const saved = loadState('wfd-places-v1', null)
  if (saved && Array.isArray(saved.places) && saved.places.length) return saved

  const home = makePlace('Home', '🏠')
  const oldFoods = loadState('wfd-foods', null)
  home.foods =
    Array.isArray(oldFoods) && oldFoods.length
      ? oldFoods
      : ['Pizza', 'Sushi', 'Burgers', 'Tacos', 'Thai'].map(makeFood)

  const mall = makePlace('Mall', '🛍️', ['Burgers', 'Ramen', 'Sushi', 'Pizza', 'Dumplings'])
  const work = makePlace('Work', '💼', ['Salad', 'Sandwich', 'Curry', 'Noodles'])

  return { activePlaceId: home.id, places: [home, mall, work] }
}

// Haversine distance in metres between two { lat, lng } points.
function distanceMeters(a, b) {
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

const GEO_RADIUS_M = 250 // how close you must be to auto-switch to a pinned place

/* -------------------------------------------------------------------------- */
/*  Misc                                                                      */
/* -------------------------------------------------------------------------- */
// Appetizing wheel palette — warm + vibrant, cycles per segment.
const WHEEL_COLORS = [
  '#f59e0b', '#f43f5e', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#ef4444', '#14b8a6', '#f97316', '#a855f7',
]

const SPIN_MS = 4800

function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// A short celebratory confetti burst over the winner modal.
function celebrate() {
  if (prefersReducedMotion()) return
  const opts = { spread: 70, startVelocity: 45, ticks: 200, zIndex: 100 }
  confetti({ ...opts, particleCount: 80, origin: { x: 0.5, y: 0.6 } })
  confetti({ ...opts, particleCount: 40, angle: 60, origin: { x: 0, y: 0.7 } })
  confetti({ ...opts, particleCount: 40, angle: 120, origin: { x: 1, y: 0.7 } })
}

// A self-contained "ta-da" chime via Web Audio — no audio asset needed.
let audioCtx = null
function getAudioContext() {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  return audioCtx
}
function playFanfare() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    // C5, E5, G5, C6 — a bright major arpeggio.
    ;[523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const t = now + i * 0.12
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.4)
    })
  } catch {
    // Audio is best-effort; never let it break the win.
  }
}

/* -------------------------------------------------------------------------- */
/*  App                                                                       */
/* -------------------------------------------------------------------------- */
export default function App() {
  // Load places once — the lazy initializer runs bootstrapPlaces a single time,
  // so both states derive from the same generated id set.
  const [boot] = useState(bootstrapPlaces)
  const [places, setPlaces] = useState(boot.places)
  const [activePlaceId, setActivePlaceId] = useState(boot.activePlaceId)
  const [history, setHistory] = useState(() => loadState('wfd-history', []))

  const [input, setInput] = useState('')
  const [error, setError] = useState('') // food/spin validation (shown by the wheel)
  const [status, setStatus] = useState('') // location feedback (shown by the location bar)
  const [locating, setLocating] = useState(false)
  const [placeModal, setPlaceModal] = useState(null) // { mode:'add'|'edit', id?, name, emoji }
  // Photo picker shown when adding a food: { name, status, results, selectedId }
  const [photoPicker, setPhotoPicker] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // food pending removal
  const [muted, setMuted] = useState(() => loadState('wfd-muted', false))

  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState(null) // food object once spin resolves
  const winnerIndexRef = useRef(null)

  /* ------------------------------ Persistence ----------------------------- */
  useEffect(() => {
    // Persist a valid active id even if the current one was just deleted.
    const validId = places.some((p) => p.id === activePlaceId) ? activePlaceId : places[0]?.id
    localStorage.setItem('wfd-places-v1', JSON.stringify({ activePlaceId: validId, places }))
  }, [places, activePlaceId])
  useEffect(() => {
    localStorage.setItem('wfd-history', JSON.stringify(history))
  }, [history])
  useEffect(() => {
    localStorage.setItem('wfd-muted', JSON.stringify(muted))
  }, [muted])

  // Auto-clear transient toasts.
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 2500)
    return () => clearTimeout(t)
  }, [error])
  useEffect(() => {
    if (!status) return
    const t = setTimeout(() => setStatus(''), 3500)
    return () => clearTimeout(t)
  }, [status])

  /* ------------------------------- Derived -------------------------------- */
  const activePlace = useMemo(
    () => places.find((p) => p.id === activePlaceId) ?? places[0],
    [places, activePlaceId],
  )
  const foods = useMemo(() => activePlace?.foods ?? [], [activePlace])
  const segAngle = useMemo(() => 360 / Math.max(foods.length, 1), [foods.length])

  // conic-gradient background for the wheel slices.
  const wheelBackground = useMemo(() => {
    if (foods.length === 0) return '#1e293b'
    const stops = foods
      .map((_, i) => {
        const color = WHEEL_COLORS[i % WHEEL_COLORS.length]
        return `${color} ${i * segAngle}deg ${(i + 1) * segAngle}deg`
      })
      .join(', ')
    return `conic-gradient(${stops})`
  }, [foods, segAngle])

  /* ----------------------------- Food actions ---------------------------- */
  function updateActivePlaceFoods(updater) {
    setPlaces((prev) =>
      prev.map((p) => (p.id === activePlace.id ? { ...p, foods: updater(p.foods) } : p)),
    )
  }

  // Adds a finished food object to the active menu and resets the input.
  function commitFood(name, image) {
    updateActivePlaceFoods((list) => [...list, makeFood(name, image)])
    setInput('')
    setError('')
    setPhotoPicker(null)
  }

  // Validate the input, then open the photo picker and search Openverse for it.
  function handleAddFood(e) {
    e.preventDefault()
    const name = input.trim()
    if (!name) {
      setError('Please type a food name first.')
      return
    }
    if (foods.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setError(`"${name}" is already on ${activePlace.name}'s menu.`)
      return
    }
    setError('')
    setPhotoPicker({ name, status: 'loading', results: [], selectedId: null })
    searchFoodImages(name, 8)
      .then((results) =>
        setPhotoPicker((p) =>
          p && p.name === name
            ? {
                ...p,
                status: results.length ? 'ok' : 'empty',
                results,
                selectedId: results[0]?.id ?? null,
              }
            : p,
        ),
      )
      .catch(() =>
        setPhotoPicker((p) => (p && p.name === name ? { ...p, status: 'error' } : p)),
      )
  }

  function confirmPhoto() {
    const chosen = photoPicker.results.find((r) => r.id === photoPicker.selectedId)
    // Fall back to the keyword/hash image if nothing was selectable.
    commitFood(photoPicker.name, chosen?.thumb)
  }

  // Ask before removing — but keep the min-2 guard up front (no dialog if blocked).
  function requestDelete(food) {
    if (foods.length <= 2) {
      setError('Keep at least 2 options to spin.')
      return
    }
    setConfirmDelete(food)
  }

  function handleDelete(id) {
    updateActivePlaceFoods((list) => list.filter((f) => f.id !== id))
  }

  function confirmRemove() {
    if (confirmDelete) handleDelete(confirmDelete.id)
    setConfirmDelete(null)
  }

  /* ----------------------------- Place actions --------------------------- */
  function switchPlace(id) {
    if (isSpinning) return
    setActivePlaceId(id)
    setError('')
  }

  function openAddPlace() {
    setPlaceModal({ mode: 'add', name: '', emoji: '🍽️' })
  }
  function openEditPlace() {
    setPlaceModal({ mode: 'edit', id: activePlace.id, name: activePlace.name, emoji: activePlace.emoji })
  }
  function savePlace() {
    const name = placeModal.name.trim()
    if (!name) return
    if (placeModal.mode === 'add') {
      const place = makePlace(name, placeModal.emoji)
      setPlaces((prev) => [...prev, place])
      setActivePlaceId(place.id)
    } else {
      setPlaces((prev) =>
        prev.map((p) => (p.id === placeModal.id ? { ...p, name, emoji: placeModal.emoji } : p)),
      )
    }
    setPlaceModal(null)
  }
  function deletePlace() {
    if (places.length <= 1) return
    setPlaces((prev) => prev.filter((p) => p.id !== placeModal.id))
    setPlaceModal(null)
  }
  function clearPin() {
    setPlaces((prev) => prev.map((p) => (p.id === placeModal.id ? { ...p, coords: null } : p)))
  }

  /* ----------------------------- Geolocation ----------------------------- */
  function withPosition(onOk) {
    if (!('geolocation' in navigator)) {
      setStatus('⚠️ Location isn’t available on this device.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        onOk({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        setLocating(false)
        setStatus(
          err.code === err.PERMISSION_DENIED
            ? '⚠️ Location permission denied.'
            : '⚠️ Couldn’t get your location.',
        )
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  function handleUseLocation() {
    withPosition((here) => {
      const pinned = places.filter((p) => p.coords)
      if (!pinned.length) {
        setStatus('No places pinned yet — use 📌 Pin here to save this spot.')
        return
      }
      let nearest = null
      let best = Infinity
      for (const p of pinned) {
        const d = distanceMeters(here, p.coords)
        if (d < best) {
          best = d
          nearest = p
        }
      }
      if (nearest && best <= GEO_RADIUS_M) {
        setActivePlaceId(nearest.id)
        setStatus(`📍 Switched to ${nearest.emoji} ${nearest.name}`)
      } else {
        setStatus(`No saved place within ${GEO_RADIUS_M}m — 📌 Pin here to save it.`)
      }
    })
  }

  function handlePinHere() {
    withPosition((here) => {
      setPlaces((prev) => prev.map((p) => (p.id === activePlace.id ? { ...p, coords: here } : p)))
      setStatus(`📌 Pinned ${activePlace.emoji} ${activePlace.name} to your location.`)
    })
  }

  /* -------------------------------- Spin --------------------------------- */
  function handleSpin() {
    if (isSpinning || foods.length < 2) return
    setError('')

    // Resume the audio context on this user gesture so the win chime can play.
    if (!muted) getAudioContext()?.resume?.()

    const winnerIndex = Math.floor(Math.random() * foods.length)
    winnerIndexRef.current = winnerIndex

    // Land the winning segment's centre under the top pointer (0deg).
    const center = winnerIndex * segAngle + segAngle / 2
    const targetMod = (360 - center) % 360
    const currentMod = ((rotation % 360) + 360) % 360
    let delta = targetMod - currentMod
    if (delta < 0) delta += 360

    const fullSpins = 6
    setRotation(rotation + fullSpins * 360 + delta)
    setIsSpinning(true)
  }

  function handleSpinEnd() {
    if (!isSpinning) return
    setIsSpinning(false)
    const idx = winnerIndexRef.current
    if (idx == null || !foods[idx]) return
    const win = foods[idx]
    setWinner(win)
    celebrate()
    if (!muted) playFanfare()
    setHistory((prev) => [
      {
        id: uid('hist'),
        name: win.name,
        image: win.image,
        time: Date.now(),
        place: { name: activePlace.name, emoji: activePlace.emoji },
      },
      ...prev,
    ])
  }

  /* ----------------------------- History actions ------------------------- */
  // Record whether the user actually went and ate the suggested dinner.
  // Tapping the already-selected status clears it back to "pending".
  function markEaten(id, value) {
    setHistory((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e
        const next = e.eaten === value ? null : value
        return { ...e, eaten: next, eatenAt: next === true ? Date.now() : null }
      }),
    )
  }

  const canSpin = foods.length >= 2 && !isSpinning
  const editingPlace = placeModal?.id ? places.find((p) => p.id === placeModal.id) : null

  /* -------------------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-neutral-950 text-slate-100">
      <div className="relative mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        {/* Sound toggle */}
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          title={muted ? 'Sound off' : 'Sound on'}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-300 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/10 sm:right-6"
        >
          {muted ? '🔇' : '🔊'}
        </button>

        {/* Header */}
        <header className="text-center">
          <h1 className="bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
            What&apos;s for Dinner?
          </h1>
          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            Pick a place, spin the wheel, and let fate plate your dinner. 🍽️
          </p>
        </header>

        {/* Place selector */}
        <section className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {places.map((p) => {
              const active = p.id === activePlace.id
              return (
                <button
                  key={p.id}
                  onClick={() => switchPlace(p.id)}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                    active
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/25'
                      : 'bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10'
                  }`}
                >
                  <span>{p.emoji}</span>
                  <span>{p.name}</span>
                  {p.coords && <span title="Location pinned">📍</span>}
                </button>
              )
            })}
            <button
              onClick={openEditPlace}
              aria-label="Edit current place"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-300 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/10"
            >
              ✎
            </button>
            <button
              onClick={openAddPlace}
              aria-label="Add a place"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-lg text-slate-300 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/10"
            >
              ＋
            </button>
          </div>

          {/* Location bar */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={handleUseLocation}
              disabled={locating}
              className="rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/10 disabled:opacity-60"
            >
              {locating ? '… Locating' : '📍 Use my location'}
            </button>
            <button
              onClick={handlePinHere}
              disabled={locating}
              className="rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/10 disabled:opacity-60"
            >
              📌 Pin here
            </button>
          </div>
          {status && (
            <p className="animate-fade-in mt-3 text-center text-sm font-medium text-amber-300">
              {status}
            </p>
          )}
        </section>

        {/* Wheel */}
        <section className="flex flex-col items-center">
          <div className="relative">
            {/* Pointer */}
            <div className="absolute -top-1 left-1/2 z-20 h-0 w-0 -translate-x-1/2 border-l-[14px] border-r-[14px] border-t-[26px] border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_3px_4px_rgba(0,0,0,0.5)]" />

            {/* Outer ring */}
            <div className="rounded-full bg-gradient-to-br from-amber-300 to-rose-400 p-1.5 shadow-2xl shadow-rose-500/20 sm:p-2">
              {/* Spinning disc */}
              <div
                onTransitionEnd={handleSpinEnd}
                className="relative h-72 w-72 rounded-full sm:h-96 sm:w-96"
                style={{
                  background: wheelBackground,
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning
                    ? `transform ${SPIN_MS}ms cubic-bezier(0.1, 0.8, 0.3, 1)`
                    : 'none',
                }}
              >
                {/* Slice labels */}
                {foods.map((food, i) => {
                  const rotate = i * segAngle + segAngle / 2
                  return (
                    <div
                      key={food.id}
                      className="pointer-events-none absolute inset-0"
                      style={{ transform: `rotate(${rotate}deg)` }}
                    >
                      <span className="absolute left-1/2 top-3 max-w-[5.5rem] -translate-x-1/2 truncate text-center text-sm font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_70%)] sm:top-5 sm:max-w-[7rem] sm:text-base">
                        {food.name}
                      </span>
                    </div>
                  )
                })}

                {foods.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center px-10 text-center text-sm text-slate-400">
                    Add some food below to fill the wheel
                  </div>
                )}

                {/* Subtle inner sheen */}
                <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
              </div>
            </div>

            {/* Spin button (center hub) */}
            <button
              onClick={handleSpin}
              disabled={!canSpin}
              className="absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-amber-400 to-orange-500 text-base font-black uppercase tracking-wide text-white shadow-lg shadow-black/40 transition-all duration-300 hover:scale-110 hover:shadow-amber-400/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 sm:h-24 sm:w-24 sm:text-lg"
            >
              {isSpinning ? '…' : 'Spin'}
            </button>
          </div>

          {error && (
            <p className="animate-fade-in mt-6 rounded-full bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-300 ring-1 ring-rose-500/30">
              {error}
            </p>
          )}
        </section>

        {/* Food management */}
        <section className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur sm:p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-100">
            {activePlace.emoji} {activePlace.name} — Menu
          </h2>

          <form onSubmit={handleAddFood} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add a dish… e.g. Ramen"
              className="min-w-0 flex-1 rounded-xl border-0 bg-slate-800/80 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 ring-1 ring-white/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 sm:text-base"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:scale-105 hover:shadow-orange-500/40 active:scale-95 sm:text-base"
            >
              Add Food
            </button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {foods.map((food) => (
              <div
                key={food.id}
                className="group animate-fade-in relative overflow-hidden rounded-2xl bg-slate-800/60 ring-1 ring-white/10 transition-all duration-300 hover:ring-amber-400/50"
              >
                <FoodImage
                  name={food.name}
                  src={food.image}
                  className="h-24 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-28"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                  <span className="text-sm font-semibold text-white drop-shadow">{food.name}</span>
                </div>
                <button
                  onClick={() => requestDelete(food)}
                  aria-label={`Remove ${food.name}`}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-all duration-300 hover:bg-rose-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* History */}
        <section>
          <h2 className="mb-4 text-lg font-bold text-slate-100">Dinner History</h2>
          {history.length === 0 ? (
            <p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-slate-500 ring-1 ring-white/10">
              No spins yet — your past dinners will appear here. 🕑
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="animate-fade-in flex items-start gap-4 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/10"
                >
                  <FoodImage
                    name={entry.name}
                    src={entry.image}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-100">{entry.name}</p>
                      {entry.place && (
                        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                          {entry.place.emoji} {entry.place.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">Spun {formatDate(entry.time)}</p>
                    {entry.eaten === true && (
                      <p className="text-xs font-medium text-emerald-400">
                        ✓ Ate this{entry.eatenAt ? ` · ${formatDate(entry.eatenAt)}` : ''}
                      </p>
                    )}
                    {entry.eaten === false && (
                      <p className="text-xs font-medium text-slate-500">✗ Didn’t go</p>
                    )}
                  </div>

                  {/* Did you actually go eat this? */}
                  <div className="flex shrink-0 flex-col items-stretch gap-1">
                    <button
                      onClick={() => markEaten(entry.id, true)}
                      aria-pressed={entry.eaten === true}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                        entry.eaten === true
                          ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                          : 'bg-white/5 text-slate-400 ring-1 ring-white/10 hover:bg-white/10'
                      }`}
                    >
                      ✅ Ate it
                    </button>
                    <button
                      onClick={() => markEaten(entry.id, false)}
                      aria-pressed={entry.eaten === false}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                        entry.eaten === false
                          ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                          : 'bg-white/5 text-slate-400 ring-1 ring-white/10 hover:bg-white/10'
                      }`}
                    >
                      ❌ Didn’t
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="pb-4 pt-2 text-center text-xs text-slate-600">
          Built with React + Vite + Tailwind · Photos from Unsplash
        </footer>
      </div>

      {/* Winner modal */}
      {winner && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setWinner(null)}
        >
          <div
            className="animate-pop-in w-full max-w-sm overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-56 w-full">
              <FoodImage
                name={winner.name}
                src={winner.image || imageForFood(winner.name, 800)}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
            </div>
            <div className="px-6 pb-6 pt-2 text-center">
              <p className="text-sm font-medium uppercase tracking-widest text-amber-400">
                🎉 Tonight&apos;s Dinner is
              </p>
              <h3 className="mt-1 text-3xl font-black text-white">{winner.name}!</h3>
              <button
                onClick={() => setWinner(null)}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / edit place modal */}
      {placeModal && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setPlaceModal(null)}
        >
          <div
            className="animate-pop-in w-full max-w-sm rounded-3xl bg-slate-900 p-6 shadow-2xl ring-1 ring-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-xl font-bold text-white">
              {placeModal.mode === 'add' ? 'New place' : 'Edit place'}
            </h3>

            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Name
            </label>
            <input
              type="text"
              autoFocus
              value={placeModal.name}
              onChange={(e) => setPlaceModal((m) => ({ ...m, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && savePlace()}
              placeholder="e.g. Gym, Beach, Downtown"
              className="w-full rounded-xl border-0 bg-slate-800/80 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            <label className="mb-2 mt-4 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setPlaceModal((m) => ({ ...m, emoji }))}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all duration-200 ${
                    placeModal.emoji === emoji
                      ? 'bg-amber-400/20 ring-2 ring-amber-400'
                      : 'bg-slate-800/80 ring-1 ring-white/10 hover:bg-slate-700/80'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {editingPlace?.coords && (
              <button
                onClick={clearPin}
                className="mt-4 text-sm font-medium text-rose-300 hover:text-rose-200"
              >
                📍 Clear pinned location
              </button>
            )}

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={savePlace}
                disabled={!placeModal.name.trim()}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 font-bold text-white shadow-lg shadow-orange-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                Save
              </button>
              {placeModal.mode === 'edit' && (
                <button
                  onClick={deletePlace}
                  disabled={places.length <= 1}
                  title={places.length <= 1 ? 'Keep at least one place' : 'Delete place'}
                  className="rounded-xl bg-rose-500/15 px-4 py-3 font-bold text-rose-300 ring-1 ring-rose-500/30 transition-all duration-300 hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setPlaceModal(null)}
                className="rounded-xl bg-white/5 px-4 py-3 font-medium text-slate-300 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo picker (shown when adding a food) */}
      {photoPicker && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setPhotoPicker(null)}
        >
          <div
            className="animate-pop-in w-full max-w-md rounded-3xl bg-slate-900 p-6 shadow-2xl ring-1 ring-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white">
              Pick a photo for <span className="text-amber-300">{photoPicker.name}</span>
            </h3>
            <p className="mb-4 mt-1 text-sm text-slate-400">
              Tap the one that looks right, then add it to your menu.
            </p>

            {photoPicker.status === 'loading' && (
              <div className="flex h-40 items-center justify-center text-slate-400">
                Finding photos…
              </div>
            )}

            {photoPicker.status === 'ok' && (
              <div className="grid grid-cols-4 gap-2">
                {photoPicker.results.map((r) => {
                  const selected = r.id === photoPicker.selectedId
                  return (
                    <button
                      key={r.id}
                      onClick={() => setPhotoPicker((p) => ({ ...p, selectedId: r.id }))}
                      className={`relative aspect-square overflow-hidden rounded-xl transition-all duration-200 ${
                        selected ? 'ring-2 ring-amber-400' : 'ring-1 ring-white/10 hover:ring-white/30'
                      }`}
                    >
                      <img
                        src={r.thumb}
                        alt={r.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          if (e.currentTarget.dataset.fb) return
                          e.currentTarget.dataset.fb = '1'
                          e.currentTarget.src = placeholderImage(photoPicker.name)
                        }}
                      />
                      {selected && (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs text-slate-900">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {(photoPicker.status === 'empty' || photoPicker.status === 'error') && (
              <p className="rounded-xl bg-white/5 px-4 py-6 text-center text-sm text-slate-400 ring-1 ring-white/10">
                {photoPicker.status === 'error'
                  ? 'Couldn’t reach the photo search.'
                  : `No photos found for "${photoPicker.name}".`}{' '}
                You can still add it with a default image.
              </p>
            )}

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={confirmPhoto}
                disabled={photoPicker.status === 'loading' || photoPicker.selectedId == null}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 font-bold text-white shadow-lg shadow-orange-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                Add to menu
              </button>
              <button
                onClick={() => commitFood(photoPicker.name)}
                disabled={photoPicker.status === 'loading'}
                className="rounded-xl bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/10 disabled:opacity-50"
              >
                Use default
              </button>
              <button
                onClick={() => setPhotoPicker(null)}
                className="rounded-xl bg-white/5 px-4 py-3 text-sm font-medium text-slate-300 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>

            <p className="mt-3 text-center text-[11px] text-slate-600">
              Photos via Openverse (Creative Commons)
            </p>
          </div>
        </div>
      )}

      {/* Confirm remove food */}
      {confirmDelete && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="animate-pop-in w-full max-w-sm rounded-3xl bg-slate-900 p-6 text-center shadow-2xl ring-1 ring-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white">Remove this dish?</h3>
            <p className="mt-2 text-sm text-slate-400">
              <span className="font-semibold text-slate-200">{confirmDelete.name}</span> will be
              removed from {activePlace.emoji} {activePlace.name}.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={confirmRemove}
                className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 px-4 py-3 font-bold text-white shadow-lg shadow-rose-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                Remove
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl bg-white/5 px-4 py-3 font-medium text-slate-300 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
