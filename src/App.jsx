import { useEffect, useMemo, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { placeholderImage, needsImage, searchFoodImages } from './lib/photos'
import { uid, makeFood, makePlace, loadState, bootstrapPlaces } from './lib/storage'
import { distanceMeters, formatDistance, GEO_RADIUS_M, searchNearbyRestaurants } from './lib/geo'
import { weightedPick } from './lib/spin'
import { buildBackup, validateBackup, applyBackup } from './lib/backup'

// Food <img> that falls back to a placeholder on error / missing src and avoids
// hotlink blocks via a no-referrer policy.
function FoodImage({ name, src, className }) {
  return (
    <img
      src={typeof src === 'string' && src ? src : placeholderImage(name)}
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

const EMOJI_CHOICES = ['🏠', '🛍️', '💼', '🏖️', '✈️', '🎬', '🏟️', '🏞️', '🎓', '☕', '🍽️', '🎉']

/* -------------------------------------------------------------------------- */
/*  Misc                                                                      */
/* -------------------------------------------------------------------------- */
// Curated warm earth/jewel palette — harmonious, premium, cycles per segment.
const WHEEL_COLORS = [
  '#d2703a', '#e0a458', '#8e9b7c', '#c98b6b',
  '#a6603c', '#6e8b7b', '#d98e73', '#b08968',
]

// Warm confetti to match the cream theme.
const CONFETTI_COLORS = ['#d2703a', '#e0a458', '#8e9b7c', '#c98b6b', '#a6603c', '#fffdfa']

const SPIN_MS = 4800

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

// Best-effort haptic buzz (Android/Chrome; a no-op where unsupported). Honours
// the same mute toggle as sound, so "mute" means a fully calm spin.
function vibrate(pattern) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    // best-effort
  }
}

// A short celebratory confetti burst over the winner modal.
function celebrate() {
  if (prefersReducedMotion()) return
  const opts = { spread: 70, startVelocity: 45, ticks: 200, zIndex: 100, colors: CONFETTI_COLORS }
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

// An upward "whoosh" as the wheel launches.
function playWhoosh() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(180, now)
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.35)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.42)
  } catch {
    // best-effort
  }
}

// A short "click" as a wheel segment passes the pointer.
function playTick() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 1250
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.04)
  } catch {
    // best-effort
  }
}

// Read the wheel's current visual rotation (degrees, 0–360) from its transform.
function readWheelAngle(el) {
  const t = el && getComputedStyle(el).transform
  if (!t || t === 'none') return 0
  const m = t.match(/matrix\(([^)]+)\)/)
  if (!m) return 0
  const [a, b] = m[1].split(',').map(Number)
  let deg = (Math.atan2(b, a) * 180) / Math.PI
  if (deg < 0) deg += 360
  return deg
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
  const [confirmClearHistory, setConfirmClearHistory] = useState(false) // history wipe pending
  // Nearby-restaurants picker: { status:'loading'|'ok'|'empty'|'error', results, selected: string[] }
  const [nearbyModal, setNearbyModal] = useState(null)
  const [importConfirm, setImportConfirm] = useState(null) // parsed backup awaiting confirm
  const [backupMsg, setBackupMsg] = useState('') // inline feedback by the footer buttons
  const [muted, setMuted] = useState(() => loadState('wfd-muted', false))
  const [shareCopied, setShareCopied] = useState(false) // brief "copied!" feedback

  // Smarter spinning
  const [variety, setVariety] = useState(() => loadState('wfd-variety', true))
  const [knockout, setKnockout] = useState(() => loadState('wfd-knockout', false))
  const [roundWon, setRoundWon] = useState(() => loadState('wfd-round', [])) // food ids won this round
  const lastWinnerId = useRef(null)

  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState(null) // food object once spin resolves
  const winnerIndexRef = useRef(null)
  const wheelRef = useRef(null) // the rotating disc, read for spin tick sounds
  const tickRafRef = useRef(null)

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
  useEffect(() => {
    localStorage.setItem('wfd-variety', JSON.stringify(variety))
  }, [variety])
  useEffect(() => {
    localStorage.setItem('wfd-knockout', JSON.stringify(knockout))
  }, [knockout])
  useEffect(() => {
    localStorage.setItem('wfd-round', JSON.stringify(roundWon))
  }, [roundWon])

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
  useEffect(() => {
    if (!backupMsg) return
    const t = setTimeout(() => setBackupMsg(''), 3500)
    return () => clearTimeout(t)
  }, [backupMsg])

  // Close whichever overlay is open on Escape (innermost first).
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      if (photoPicker) setPhotoPicker(null)
      else if (placeModal) setPlaceModal(null)
      else if (nearbyModal) setNearbyModal(null)
      else if (confirmDelete) setConfirmDelete(null)
      else if (confirmClearHistory) setConfirmClearHistory(false)
      else if (importConfirm) setImportConfirm(null)
      else if (winner) setWinner(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [photoPicker, placeModal, nearbyModal, confirmDelete, confirmClearHistory, importConfirm, winner])

  /* ------------------------------- Derived -------------------------------- */
  const activePlace = useMemo(
    () => places.find((p) => p.id === activePlaceId) ?? places[0],
    [places, activePlaceId],
  )
  const foods = useMemo(() => activePlace?.foods ?? [], [activePlace])
  const segAngle = useMemo(() => 360 / Math.max(foods.length, 1), [foods.length])

  // conic-gradient background for the wheel slices.
  const wheelBackground = useMemo(() => {
    if (foods.length === 0) return 'radial-gradient(circle at 50% 38%, #dca97e, #a6603c)'
    const stops = foods
      .map((_, i) => {
        const color = WHEEL_COLORS[i % WHEEL_COLORS.length]
        return `${color} ${i * segAngle}deg ${(i + 1) * segAngle}deg`
      })
      .join(', ')
    return `conic-gradient(${stops})`
  }, [foods, segAngle])

  // Heal seeded / legacy foods (no image, or a dead Unsplash URL) by fetching a
  // photo from Openverse the first time their place is viewed — one gentle pass
  // per place per session; results persist, so it's a one-time cost.
  const placesRef = useRef(places)
  useEffect(() => {
    placesRef.current = places
  }, [places])
  const healedPlaces = useRef(new Set())
  useEffect(() => {
    const place = placesRef.current.find((p) => p.id === activePlaceId) ?? placesRef.current[0]
    if (!place || healedPlaces.current.has(place.id)) return
    healedPlaces.current.add(place.id) // mark up front so re-renders don't re-enter
    const needs = place.foods.filter((f) => needsImage(f.image))
    if (!needs.length) return
    let cancelled = false
    ;(async () => {
      for (const food of needs) {
        if (cancelled) break
        try {
          const [first] = await searchFoodImages(food.imageQuery || food.name, 1)
          const image = first?.full || first?.thumb
          if (image && !cancelled) {
            setPlaces((prev) =>
              prev.map((p) =>
                p.id === place.id
                  ? {
                      ...p,
                      foods: p.foods.map((f) =>
                        f.id === food.id ? { ...f, image } : f,
                      ),
                    }
                  : p,
              ),
            )
          }
        } catch {
          // leave the placeholder in place
        }
        await new Promise((r) => setTimeout(r, 600)) // be gentle on the API
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activePlaceId])

  /* ----------------------------- Food actions ---------------------------- */
  function updateActivePlaceFoods(updater) {
    setPlaces((prev) =>
      prev.map((p) => (p.id === activePlace.id ? { ...p, foods: updater(p.foods) } : p)),
    )
  }

  // Open the photo picker for a dish — `editId` set means we're changing an
  // existing food's photo (not adding a new one). Searches both sources.
  function openPhotoPicker(name, editId = null) {
    setError('')
    setPhotoPicker({ name, editId, status: 'loading', results: [], selectedId: null, customUrl: '' })
    const same = (p) => p && p.name === name && p.editId === editId
    searchFoodImages(name, 8)
      .then((results) =>
        setPhotoPicker((p) =>
          same(p)
            ? { ...p, status: results.length ? 'ok' : 'empty', results, selectedId: results[0]?.id ?? null }
            : p,
        ),
      )
      .catch(() => setPhotoPicker((p) => (same(p) ? { ...p, status: 'error' } : p)))
  }

  // Validate the input, then open the picker to add a new dish.
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
    openPhotoPicker(name)
  }

  // Apply the chosen image — either updating an existing food or adding a new one.
  function applyPhoto(image) {
    const pp = photoPicker
    if (!pp) return
    if (pp.editId) {
      updateActivePlaceFoods((list) =>
        list.map((f) => (f.id === pp.editId ? { ...f, image: image ?? null } : f)),
      )
    } else {
      updateActivePlaceFoods((list) => [...list, makeFood(pp.name, image)])
      setInput('')
    }
    setError('')
    setPhotoPicker(null)
  }

  function confirmPhoto() {
    const pp = photoPicker
    const image =
      pp.selectedId === 'custom'
        ? pp.customUrl.trim()
        : pp.results.find((r) => r.id === pp.selectedId)?.full
    applyPhoto(image)
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

  // Find eateries around the user's current location, then open the picker.
  function handleNearby() {
    withPosition((here) => runNearbySearch(here.lat, here.lng, 3000))
  }

  // Query OSM at a given radius. Re-run by the distance pills; keeps the resolved
  // position so changing radius never re-prompts for location.
  function runNearbySearch(lat, lng, radius) {
    setNearbyModal({ status: 'loading', results: [], selected: [], lat, lng, radius, typeFilter: 'all' })
    searchNearbyRestaurants(lat, lng, radius)
      .then((results) =>
        setNearbyModal((m) =>
          m && m.radius === radius && m.status === 'loading'
            ? {
                ...m,
                status: results.length ? 'ok' : 'empty',
                results,
                selected: results.slice(0, 12).map((r) => r.name),
              }
            : m,
        ),
      )
      .catch(() =>
        setNearbyModal((m) =>
          m && m.radius === radius ? { ...m, status: 'error', results: [], selected: [] } : m,
        ),
      )
  }

  // Toggle a restaurant in the picker's selection.
  function toggleNearby(name) {
    setNearbyModal((m) =>
      m
        ? {
            ...m,
            selected: m.selected.includes(name)
              ? m.selected.filter((n) => n !== name)
              : [...m.selected, name],
          }
        : m,
    )
  }

  // Drop the chosen restaurants into a dedicated "Nearby" place and switch to it,
  // so the existing wheel/spin/history all work on real nearby spots. Each food
  // carries its coords (for "Open in Maps") and a cuisine-based image query.
  function applyNearby() {
    const chosen = nearbyModal.results.filter((r) => nearbyModal.selected.includes(r.name))
    if (!chosen.length) return
    const foods = chosen.map((r) => ({
      ...makeFood(r.name),
      lat: r.lat,
      lng: r.lng,
      imageQuery: r.cuisine || (r.kind === 'cafe' ? 'cafe' : 'restaurant food'),
    }))
    const existing = places.find((p) => p.name === 'Nearby')
    if (existing) {
      setPlaces((prev) => prev.map((p) => (p.id === existing.id ? { ...p, foods } : p)))
      setActivePlaceId(existing.id)
      healedPlaces.current.delete(existing.id) // let the refreshed spots heal their images
    } else {
      const place = makePlace('Nearby', '🍴')
      place.foods = foods
      setPlaces((prev) => [...prev, place])
      setActivePlaceId(place.id)
    }
    setNearbyModal(null)
    setStatus(`🍴 Added ${foods.length} nearby ${foods.length === 1 ? 'spot' : 'spots'} to spin`)
  }

  /* --------------------------- Spin tick sounds -------------------------- */
  // Click each time a segment passes the pointer. We read the wheel's real
  // rotation per frame, so clicks naturally start as a fast buzz and slow to
  // distinct ticks as the wheel decelerates. (Capped to one click per frame.)
  function startTicking() {
    if (muted) return
    const el = wheelRef.current
    if (!el) return
    const seg = 360 / Math.max(foods.length, 1)
    let prev = readWheelAngle(el)
    let traveled = 0
    let nextTick = seg
    const step = () => {
      const cur = readWheelAngle(el)
      let d = cur - prev
      if (d < -180) d += 360 // crossed the 360→0 wrap
      if (d < 0) d = 0 // ignore sub-pixel jitter
      traveled += d
      prev = cur
      let played = false
      while (traveled >= nextTick) {
        nextTick += seg
        if (!played) {
          playTick()
          played = true
        }
      }
      tickRafRef.current = requestAnimationFrame(step)
    }
    tickRafRef.current = requestAnimationFrame(step)
  }
  function stopTicking() {
    if (tickRafRef.current) cancelAnimationFrame(tickRafRef.current)
    tickRafRef.current = null
  }
  // Stop any in-flight tick loop on unmount.
  useEffect(() => () => {
    if (tickRafRef.current) cancelAnimationFrame(tickRafRef.current)
  }, [])

  /* -------------------------------- Spin --------------------------------- */
  function handleSpin() {
    if (isSpinning || foods.length < 2) return
    setError('')

    // Resume the audio context on this user gesture so the win chime can play.
    if (!muted) getAudioContext()?.resume?.()

    // Build the eligible pool, then pick the winner.
    let pool = foods.map((_, i) => i)
    if (knockout) pool = pool.filter((i) => !roundWon.includes(foods[i].id))
    if (pool.length === 0) return // round complete (spin is disabled, but guard anyway)
    // Avoid repeating the immediately previous winner when there's an alternative.
    if (pool.length > 1 && lastWinnerId.current) {
      const filtered = pool.filter((i) => foods[i].id !== lastWinnerId.current)
      if (filtered.length) pool = filtered
    }
    const winnerIndex = variety
      ? weightedPick(pool, foods, history.map((h) => h.name.toLowerCase()))
      : pool[Math.floor(Math.random() * pool.length)]
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

    if (!muted) {
      playWhoosh()
      startTicking()
      vibrate(18)
    }
    // Safety net: stop ticking even if the transitionend event is missed.
    setTimeout(stopTicking, SPIN_MS + 300)
  }

  function handleSpinEnd() {
    stopTicking()
    if (!isSpinning) return
    setIsSpinning(false)
    const idx = winnerIndexRef.current
    if (idx == null || !foods[idx]) return
    const win = foods[idx]
    lastWinnerId.current = win.id
    if (knockout) setRoundWon((prev) => (prev.includes(win.id) ? prev : [...prev, win.id]))
    setWinner(win)
    celebrate()
    if (!muted) {
      playFanfare()
      vibrate([35, 25, 90])
    }
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

  // Close the winner and immediately spin again.
  function spinAgain() {
    setWinner(null)
    setTimeout(() => handleSpin(), 120)
  }

  // Share the winning pick — native share sheet, with a clipboard fallback.
  async function shareWinner(food) {
    if (!food) return
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const text = `Tonight's pick: ${food.name}. Decided with the What's for Dinner wheel.`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: "What's for Dinner?", text, url })
      } catch {
        // user dismissed the share sheet — nothing to do
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url ? `${text} ${url}` : text)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      setError('Sharing isn’t supported on this device.')
    }
  }
  // Knock-out: clear the active place's foods from the won-this-round set.
  function resetRound() {
    const ids = new Set(foods.map((f) => f.id))
    setRoundWon((prev) => prev.filter((id) => !ids.has(id)))
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

  // Remove a single history entry (low-stakes — it's just a log, so no confirm).
  function removeHistoryEntry(id) {
    setHistory((prev) => prev.filter((e) => e.id !== id))
  }

  // Wipe the whole log (confirm-gated, like food deletion).
  function clearHistory() {
    setHistory([])
    setConfirmClearHistory(false)
  }

  /* ----------------------------- Backup actions --------------------------- */
  // Download everything (places, history, prefs) as one JSON file.
  function exportData() {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `whats-for-dinner-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setBackupMsg('Backup downloaded.')
  }

  // Parse + validate a chosen backup file, then ask before overwriting.
  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    let data
    try {
      data = JSON.parse(await file.text())
    } catch {
      setBackupMsg('That file isn’t valid JSON.')
      return
    }
    const problem = validateBackup(data)
    if (problem) {
      setBackupMsg(problem)
      return
    }
    setImportConfirm(data)
  }

  // Write the backup and reload so all state rehydrates consistently.
  function confirmImport() {
    applyBackup(importConfirm)
    window.location.reload()
  }

  // Lightweight dinner stats derived from history — a sticky, fun summary.
  const stats = useMemo(() => {
    const counts = new Map()
    for (const h of history) counts.set(h.name, (counts.get(h.name) ?? 0) + 1)
    let top = null
    let topN = 0
    for (const [name, n] of counts) {
      if (n > topN) {
        topN = n
        top = name
      }
    }
    return { total: history.length, top, eaten: history.filter((h) => h.eaten === true).length }
  }, [history])

  // Nearby picker list after the type filter (client-side; no re-fetch).
  const nearbyFiltered =
    nearbyModal?.status === 'ok'
      ? nearbyModal.results.filter(
          (r) => nearbyModal.typeFilter === 'all' || r.kind === nearbyModal.typeFilter,
        )
      : []

  const roundComplete = knockout && foods.length > 0 && foods.every((f) => roundWon.includes(f.id))
  const remaining = knockout ? foods.filter((f) => !roundWon.includes(f.id)).length : 0
  const canSpin = foods.length >= 2 && !isSpinning && !roundComplete
  const editingPlace = placeModal?.id ? places.find((p) => p.id === placeModal.id) : null

  /* -------------------------------------------------------------------------- */
  return (
    <div className="min-h-screen text-ink">
      {/* Screen-reader-only announcement of the latest spin result. */}
      <p className="sr-only" role="status" aria-live="assertive">
        {winner ? `Tonight's dinner is ${winner.name}` : ''}
      </p>

      <div className="relative mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        {/* Sound toggle */}
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          title={muted ? 'Sound off' : 'Sound on'}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-base shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md sm:right-6"
        >
          {muted ? '🔇' : '🔊'}
        </button>

        {/* Header */}
        <header className="animate-float-up text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-terra/90">
            Decide in one spin
          </p>
          <h1 className="mt-3 font-display text-[2.7rem] font-bold leading-[0.95] tracking-tight text-ink sm:text-6xl">
            What&apos;s for{' '}
            <span className="bg-gradient-to-br from-terra to-terra-deep bg-clip-text text-transparent">
              Dinner?
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted sm:text-base">
            Choose a place, spin the wheel, and get your answer in seconds.
          </p>
        </header>

        {/* Place selector */}
        <section className="-mx-4 animate-float-up px-4 [animation-delay:60ms] sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {places.map((p) => {
              const active = p.id === activePlace.id
              return (
                <button
                  key={p.id}
                  onClick={() => switchPlace(p.id)}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                    active
                      ? 'bg-gradient-to-br from-terra to-terra-light text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.55)]'
                      : 'border border-line bg-surface text-ink/70 shadow-sm hover:-translate-y-0.5 hover:border-terra/40 hover:text-ink'
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink/60 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:text-ink hover:shadow-md"
            >
              ✎
            </button>
            <button
              onClick={openAddPlace}
              aria-label="Add a place"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-lg text-ink/60 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:text-ink hover:shadow-md"
            >
              ＋
            </button>
          </div>

          {/* Location bar */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={handleUseLocation}
              disabled={locating}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-terra/40 hover:shadow-md disabled:opacity-60"
            >
              {locating ? '… Locating' : '📍 Use my location'}
            </button>
            <button
              onClick={handlePinHere}
              disabled={locating}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-terra/40 hover:shadow-md disabled:opacity-60"
            >
              📌 Pin here
            </button>
            <button
              onClick={handleNearby}
              disabled={locating}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-terra/40 hover:shadow-md disabled:opacity-60"
            >
              🍴 Near me
            </button>
          </div>
          {status && (
            <p className="animate-fade-in mt-3 text-center text-sm font-medium text-terra">
              {status}
            </p>
          )}
        </section>

        {/* Wheel */}
        <section className="flex animate-float-up flex-col items-center [animation-delay:120ms]">
          <div className="relative">
            {/* Ambient glow behind the wheel (flares while spinning) */}
            <div
              className={`pointer-events-none absolute inset-0 -z-10 rounded-full bg-terra/30 blur-3xl transition-opacity duration-500 ${
                isSpinning ? 'opacity-90' : 'opacity-50'
              }`}
            />

            {/* Pointer — a polished gem pin (visual only; landing math is independent) */}
            <div className="absolute -top-2.5 left-1/2 z-20 -translate-x-1/2 drop-shadow-[0_5px_6px_rgba(120,80,40,0.4)]">
              <svg width="30" height="38" viewBox="0 0 32 40" fill="none" aria-hidden="true">
                <path d="M16 39 L4.5 18 A12 12 0 1 1 27.5 18 Z" fill="url(#ptr)" />
                <circle cx="16" cy="16" r="4.6" fill="#fffdf9" />
                <circle cx="16" cy="16" r="4.6" fill="none" stroke="#c2632f" strokeWidth="1.3" />
                <defs>
                  <linearGradient id="ptr" x1="16" y1="4" x2="16" y2="39" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3a302a" />
                    <stop offset="1" stopColor="#231d18" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Outer ring — a tactile gradient bezel */}
            <div className="rounded-full bg-gradient-to-br from-surface to-cream-deep p-2.5 shadow-[0_28px_70px_-20px_rgba(120,80,40,0.55)] ring-1 ring-line sm:p-3">
              {/* Spinning disc */}
              <div
                ref={wheelRef}
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
                      <span className="absolute left-1/2 top-3 max-w-[5.5rem] -translate-x-1/2 truncate text-center text-sm font-bold tracking-wide text-white [text-shadow:_0_1px_3px_rgb(60_36_20_/_55%)] sm:top-5 sm:max-w-[7rem] sm:text-base">
                        {food.name}
                      </span>
                    </div>
                  )
                })}

                {foods.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center px-10 text-center text-sm text-white/90 [text-shadow:_0_1px_2px_rgb(60_36_20_/_45%)]">
                    Add some food below to fill the wheel
                  </div>
                )}

                {/* Glossy sheen + hairline rim */}
                <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_24%,rgba(255,255,255,0.4),transparent_55%)]" />
                <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-black/5" />
              </div>
            </div>

            {/* Spin button (center hub) */}
            <button
              onClick={handleSpin}
              disabled={!canSpin}
              className={`absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-[5px] border-surface bg-gradient-to-br from-terra-light via-terra to-terra-deep text-base font-bold uppercase tracking-wider text-white shadow-[0_10px_28px_-6px_rgba(194,99,47,0.6)] transition-all duration-300 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 sm:h-24 sm:w-24 sm:text-lg ${
                canSpin ? 'animate-glow-pulse' : ''
              }`}
            >
              <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent" />
              <span className="relative">{isSpinning ? '…' : roundComplete ? 'Done' : 'Spin'}</span>
            </button>
          </div>

          {error && (
            <p className="animate-fade-in mt-6 rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
              {error}
            </p>
          )}

          {/* Smarter-spin settings */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setVariety((v) => !v)}
              aria-pressed={variety}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                variety
                  ? 'bg-gradient-to-br from-terra to-terra-light text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)]'
                  : 'border border-line bg-surface text-ink/70 shadow-sm hover:border-terra/40'
              }`}
            >
              Favor variety
            </button>
            <button
              onClick={() => setKnockout((k) => !k)}
              aria-pressed={knockout}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                knockout
                  ? 'bg-gradient-to-br from-terra to-terra-light text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)]'
                  : 'border border-line bg-surface text-ink/70 shadow-sm hover:border-terra/40'
              }`}
            >
              Knock-out
            </button>
          </div>
          {knockout && (
            <div className="mt-3 flex items-center justify-center gap-3 text-sm text-muted">
              {roundComplete ? (
                <>
                  <span className="font-medium text-terra">Round complete — everything’s been picked!</span>
                  <button
                    onClick={resetRound}
                    className="rounded-full border border-line bg-surface px-3 py-1 font-medium text-ink/80 shadow-sm transition-all duration-300 hover:border-terra/40"
                  >
                    ↺ Reset round
                  </button>
                </>
              ) : (
                <>
                  <span>
                    {remaining} of {foods.length} left this round
                  </span>
                  {remaining < foods.length && (
                    <button
                      onClick={resetRound}
                      className="rounded-full border border-line bg-surface px-3 py-1 font-medium text-ink/80 shadow-sm transition-all duration-300 hover:border-terra/40"
                    >
                      ↺ Reset
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* Food management */}
        <section className="animate-float-up rounded-3xl border border-line bg-surface p-5 shadow-card [animation-delay:180ms] sm:p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">
            {activePlace.emoji} {activePlace.name}
            <span className="text-muted"> — Menu</span>
          </h2>

          <form onSubmit={handleAddFood} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add a dish… e.g. Ramen"
              className="min-w-0 flex-1 rounded-xl border border-line bg-cream px-4 py-3 text-sm text-ink placeholder-muted/70 transition-all duration-300 focus:border-terra/50 focus:outline-none focus:ring-2 focus:ring-terra/30 sm:text-base"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-gradient-to-br from-terra to-terra-light px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-6px_rgba(194,99,47,0.6)] active:scale-95 sm:text-base"
            >
              Add Food
            </button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {foods.map((food) => {
              const picked = knockout && roundWon.includes(food.id)
              return (
              <div
                key={food.id}
                className={`group animate-fade-in relative overflow-hidden rounded-2xl border border-line bg-cream shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                  picked ? 'opacity-55' : ''
                }`}
              >
                <FoodImage
                  name={food.name}
                  src={food.image}
                  className="h-24 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-28"
                />
                {picked && (
                  <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold text-terra shadow-sm">
                    ✓ picked
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 py-2">
                  <span className="truncate text-sm font-semibold text-white drop-shadow">{food.name}</span>
                  <button
                    onClick={() => openPhotoPicker(food.name, food.id)}
                    aria-label={`Change photo for ${food.name}`}
                    title="Change photo"
                    className="shrink-0 text-base leading-none opacity-90 transition-opacity duration-300 hover:opacity-100"
                  >
                    🖼
                  </button>
                </div>
                <button
                  onClick={() => requestDelete(food)}
                  aria-label={`Remove ${food.name}`}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#2c2520]/55 text-white backdrop-blur transition-all duration-300 hover:bg-terra"
                >
                  ✕
                </button>
              </div>
              )
            })}
          </div>
        </section>

        {/* History */}
        <section className="animate-float-up [animation-delay:240ms]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-ink">Dinner History</h2>
            {history.length > 0 && (
              <button
                onClick={() => setConfirmClearHistory(true)}
                className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted shadow-sm transition-all duration-300 hover:border-terra/40 hover:text-ink"
              >
                Clear all
              </button>
            )}
          </div>

          {stats.total > 0 && (
            <div className="mb-4 grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-line bg-surface p-3 text-center shadow-soft">
                <div className="flex h-8 items-center justify-center font-display font-bold text-terra">
                  <span key={stats.total} className="animate-ping-once text-2xl">
                    {stats.total}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                  Decided
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-3 text-center shadow-soft">
                <div className="flex h-8 items-center justify-center font-display text-2xl font-bold text-sage">
                  {stats.eaten}
                </div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                  Eaten
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-3 text-center shadow-soft">
                <div
                  className="flex h-8 items-center justify-center truncate px-1 font-display text-base font-bold text-ink"
                  title={stats.top || ''}
                >
                  {stats.top || '—'}
                </div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                  Top pick
                </div>
              </div>
            </div>
          )}

          {history.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface px-4 py-6 text-center text-sm text-muted shadow-sm">
              No spins yet — your past decisions will appear here.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="animate-fade-in flex items-start gap-4 rounded-2xl border border-line bg-surface p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <FoodImage
                    name={entry.name}
                    src={entry.image}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-ink">{entry.name}</p>
                      {entry.place && (
                        <span className="shrink-0 rounded-full border border-line bg-cream px-2 py-0.5 text-xs text-muted">
                          {entry.place.emoji} {entry.place.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted">Spun {formatDate(entry.time)}</p>
                    {entry.eaten === true && (
                      <p className="text-xs font-medium text-sage">
                        ✓ Ate this{entry.eatenAt ? ` · ${formatDate(entry.eatenAt)}` : ''}
                      </p>
                    )}
                    {entry.eaten === false && (
                      <p className="text-xs font-medium text-muted">✗ Didn’t go</p>
                    )}
                  </div>

                  {/* Did you actually go eat this? */}
                  <div className="flex shrink-0 flex-col items-stretch gap-1">
                    <button
                      onClick={() => markEaten(entry.id, true)}
                      aria-pressed={entry.eaten === true}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                        entry.eaten === true
                          ? 'bg-sage/20 text-[#5d6a4c] ring-1 ring-sage/40'
                          : 'border border-line bg-cream text-muted hover:text-ink'
                      }`}
                    >
                      ✅ Ate it
                    </button>
                    <button
                      onClick={() => markEaten(entry.id, false)}
                      aria-pressed={entry.eaten === false}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                        entry.eaten === false
                          ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                          : 'border border-line bg-cream text-muted hover:text-ink'
                      }`}
                    >
                      ❌ Didn’t
                    </button>
                  </div>

                  {/* Remove this entry from the log */}
                  <button
                    onClick={() => removeHistoryEntry(entry.id)}
                    aria-label={`Remove ${entry.name} from history`}
                    title="Remove from history"
                    className="flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full border border-line bg-cream text-muted transition-all duration-300 hover:border-terra/40 hover:text-terra"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="pb-4 pt-2 text-center text-xs text-muted/70">
          <div className="mb-2 flex items-center justify-center gap-3">
            <button
              onClick={exportData}
              className="font-medium text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
            >
              Export data
            </button>
            <span aria-hidden="true">·</span>
            <label className="cursor-pointer font-medium text-muted underline-offset-2 transition-colors hover:text-ink hover:underline">
              Import data
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                className="sr-only"
              />
            </label>
          </div>
          {backupMsg && <p className="animate-fade-in mb-2 font-medium text-terra">{backupMsg}</p>}
          Built with React + Vite + Tailwind · Photos from TheMealDB &amp; Openverse
        </footer>
      </div>

      {/* Winner modal */}
      {winner && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#2c2520]/45 p-4 backdrop-blur-sm"
          onClick={() => setWinner(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="winner-title"
            className="animate-pop-in w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-60 w-full">
              <FoodImage
                name={winner.name}
                src={winner.image}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-transparent" />
            </div>
            <div className="px-6 pb-6 pt-1 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-terra">
                Tonight&apos;s pick
              </p>
              <h3 id="winner-title" className="mt-1.5 font-display text-4xl font-bold tracking-tight text-ink">
                {winner.name}
              </h3>
              {winner.lat != null && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${winner.lat},${winner.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-terra hover:underline"
                >
                  Open in Maps ↗
                </a>
              )}
              <div className="mt-6 flex items-center gap-2">
                {!roundComplete && (
                  <button
                    onClick={spinAgain}
                    className="flex-1 rounded-xl bg-gradient-to-br from-terra to-terra-light px-5 py-3 font-semibold text-white shadow-[0_10px_26px_-8px_rgba(194,99,47,0.55)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
                  >
                    Spin again
                  </button>
                )}
                <button
                  onClick={() => setWinner(null)}
                  className={`rounded-xl px-5 py-3 font-medium transition-all duration-300 active:scale-95 ${
                    roundComplete
                      ? 'flex-1 bg-gradient-to-br from-terra to-terra-light text-white shadow-[0_10px_26px_-8px_rgba(194,99,47,0.55)] hover:-translate-y-0.5'
                      : 'border border-line bg-cream text-ink/70 hover:bg-line/40'
                  }`}
                >
                  Close
                </button>
              </div>
              <button
                onClick={() => shareWinner(winner)}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-cream px-4 py-2.5 text-sm font-medium text-ink/70 transition-all duration-300 hover:border-terra/40 hover:text-ink active:scale-95"
              >
                {shareCopied ? 'Copied to clipboard' : 'Share this pick'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / edit place modal */}
      {placeModal && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#2c2520]/45 p-4 backdrop-blur-sm"
          onClick={() => setPlaceModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="place-title"
            className="animate-pop-in w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="place-title" className="mb-4 font-display text-xl font-semibold text-ink">
              {placeModal.mode === 'add' ? 'New place' : 'Edit place'}
            </h3>

            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
              Name
            </label>
            <input
              type="text"
              autoFocus
              value={placeModal.name}
              onChange={(e) => setPlaceModal((m) => ({ ...m, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && savePlace()}
              placeholder="e.g. Gym, Beach, Downtown"
              className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm text-ink placeholder-muted/70 focus:border-terra/50 focus:outline-none focus:ring-2 focus:ring-terra/30"
            />

            <label className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setPlaceModal((m) => ({ ...m, emoji }))}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all duration-200 ${
                    placeModal.emoji === emoji
                      ? 'bg-terra/15 ring-2 ring-terra'
                      : 'border border-line bg-cream hover:bg-line/40'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {editingPlace?.coords && (
              <button
                onClick={clearPin}
                className="mt-4 text-sm font-medium text-red-600 hover:text-red-700"
              >
                📍 Clear pinned location
              </button>
            )}

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={savePlace}
                disabled={!placeModal.name.trim()}
                className="flex-1 rounded-xl bg-gradient-to-br from-terra to-terra-light px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                Save
              </button>
              {placeModal.mode === 'edit' && (
                <button
                  onClick={deletePlace}
                  disabled={places.length <= 1}
                  title={places.length <= 1 ? 'Keep at least one place' : 'Delete place'}
                  className="rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-600 ring-1 ring-red-200 transition-all duration-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setPlaceModal(null)}
                className="rounded-xl border border-line bg-cream px-4 py-3 font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
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
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#2c2520]/45 p-4 backdrop-blur-sm"
          onClick={() => setPhotoPicker(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="photo-title"
            className="animate-pop-in w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="photo-title" className="font-display text-xl font-semibold text-ink">
              {photoPicker.editId ? 'Change photo for' : 'Pick a photo for'}{' '}
              <span className="text-terra">{photoPicker.name}</span>
            </h3>
            <p className="mb-4 mt-1 text-sm text-muted">
              Tap the one that looks right, or paste your own link below.
            </p>

            {photoPicker.status === 'loading' && (
              <div className="flex h-40 items-center justify-center text-muted">
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
                        selected ? 'ring-2 ring-terra' : 'ring-1 ring-line hover:ring-terra/40'
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
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-terra text-xs text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {(photoPicker.status === 'empty' || photoPicker.status === 'error') && (
              <p className="rounded-xl border border-line bg-cream px-4 py-6 text-center text-sm text-muted">
                {photoPicker.status === 'error'
                  ? 'Couldn’t reach the photo search.'
                  : `No photos found for "${photoPicker.name}".`}{' '}
                Paste a link below, or use a default image.
              </p>
            )}

            {/* Paste your own image link */}
            {photoPicker.status !== 'loading' && (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Or paste an image link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={photoPicker.customUrl}
                    onChange={(e) => {
                      const v = e.target.value
                      setPhotoPicker((p) => ({
                        ...p,
                        customUrl: v,
                        selectedId: v.trim() ? 'custom' : (p.results[0]?.id ?? null),
                      }))
                    }}
                    placeholder="https://…  (right-click an image → Copy image address)"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink placeholder-muted/70 focus:border-terra/50 focus:outline-none focus:ring-2 focus:ring-terra/30"
                  />
                  {photoPicker.customUrl.trim() && (
                    <button
                      onClick={() => setPhotoPicker((p) => ({ ...p, selectedId: 'custom' }))}
                      aria-label="Use pasted image"
                      className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg transition-all duration-200 ${
                        photoPicker.selectedId === 'custom' ? 'ring-2 ring-terra' : 'ring-1 ring-line'
                      }`}
                    >
                      <img
                        src={photoPicker.customUrl.trim()}
                        alt="preview"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          if (e.currentTarget.dataset.fb) return
                          e.currentTarget.dataset.fb = '1'
                          e.currentTarget.src = placeholderImage(photoPicker.name)
                        }}
                      />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={confirmPhoto}
                disabled={
                  photoPicker.status === 'loading' ||
                  photoPicker.selectedId == null ||
                  (photoPicker.selectedId === 'custom' && !photoPicker.customUrl.trim())
                }
                className="flex-1 rounded-xl bg-gradient-to-br from-terra to-terra-light px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {photoPicker.editId ? 'Save photo' : 'Add to menu'}
              </button>
              <button
                onClick={() => applyPhoto(undefined)}
                disabled={photoPicker.status === 'loading'}
                className="rounded-xl border border-line bg-cream px-4 py-3 text-sm font-medium text-ink/70 transition-all duration-300 hover:bg-line/40 disabled:opacity-50"
              >
                Use default
              </button>
              <button
                onClick={() => setPhotoPicker(null)}
                className="rounded-xl border border-line bg-cream px-4 py-3 text-sm font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
              >
                Cancel
              </button>
            </div>

            <p className="mt-3 text-center text-[11px] text-muted/70">
              Photos via TheMealDB &amp; Openverse
            </p>
          </div>
        </div>
      )}

      {/* Confirm remove food */}
      {confirmDelete && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#2c2520]/45 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-title"
            className="animate-pop-in w-full max-w-sm rounded-3xl border border-line bg-surface p-6 text-center shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-delete-title" className="font-display text-xl font-semibold text-ink">Remove this dish?</h3>
            <p className="mt-2 text-sm text-muted">
              <span className="font-semibold text-ink">{confirmDelete.name}</span> will be removed
              from {activePlace.emoji} {activePlace.name}.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={confirmRemove}
                className="flex-1 rounded-xl bg-gradient-to-br from-red-500 to-red-600 px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(220,60,40,0.45)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              >
                Remove
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-line bg-cream px-4 py-3 font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm clear history */}
      {confirmClearHistory && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#2c2520]/45 p-4 backdrop-blur-sm"
          onClick={() => setConfirmClearHistory(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-clear-title"
            className="animate-pop-in w-full max-w-sm rounded-3xl border border-line bg-surface p-6 text-center shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-clear-title" className="font-display text-xl font-semibold text-ink">Clear all history?</h3>
            <p className="mt-2 text-sm text-muted">
              This removes all {history.length}{' '}
              {history.length === 1 ? 'entry' : 'entries'} from your dinner history. This can’t be
              undone.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={clearHistory}
                className="flex-1 rounded-xl bg-gradient-to-br from-red-500 to-red-600 px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(220,60,40,0.45)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              >
                Clear all
              </button>
              <button
                onClick={() => setConfirmClearHistory(false)}
                className="flex-1 rounded-xl border border-line bg-cream px-4 py-3 font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restaurants near me (OpenStreetMap) */}
      {nearbyModal && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#2c2520]/45 p-4 backdrop-blur-sm"
          onClick={() => setNearbyModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="nearby-title"
            className="animate-pop-in flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl border border-line bg-surface p-6 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="nearby-title" className="font-display text-xl font-semibold text-ink">
              Restaurants near you
            </h3>
            <p className="mb-3 mt-1 text-sm text-muted">
              From OpenStreetMap. Pick the spots you&apos;d consider, then spin to decide.
            </p>

            {/* Distance selector (re-queries OSM) */}
            {nearbyModal.lat != null && (
              <div className="mb-3 flex items-center gap-1.5">
                <span className="mr-1 text-xs font-medium text-muted">Within</span>
                {[
                  [1000, '1 km'],
                  [3000, '3 km'],
                  [5000, '5 km'],
                ].map(([r, label]) => (
                  <button
                    key={r}
                    onClick={() => runNearbySearch(nearbyModal.lat, nearbyModal.lng, r)}
                    aria-pressed={nearbyModal.radius === r}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
                      nearbyModal.radius === r
                        ? 'bg-terra text-white'
                        : 'border border-line bg-cream text-ink/70 hover:border-terra/40'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {nearbyModal.status === 'loading' && (
              <div className="flex h-40 items-center justify-center text-muted">
                Finding restaurants near you…
              </div>
            )}

            {(nearbyModal.status === 'empty' || nearbyModal.status === 'error') && (
              <p className="rounded-xl border border-line bg-cream px-4 py-6 text-center text-sm text-muted">
                {nearbyModal.status === 'error'
                  ? 'Couldn’t reach the restaurant search. Please try again.'
                  : 'No restaurants found here. Try a wider distance above.'}
              </p>
            )}

            {nearbyModal.status === 'ok' && (
              <>
                {/* Type filter (client-side) */}
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  {[
                    ['all', 'All'],
                    ['restaurant', 'Restaurants'],
                    ['fast_food', 'Fast food'],
                    ['cafe', 'Cafés'],
                  ].map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setNearbyModal((m) => (m ? { ...m, typeFilter: k } : m))}
                      aria-pressed={nearbyModal.typeFilter === k}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
                        nearbyModal.typeFilter === k
                          ? 'bg-ink text-white'
                          : 'border border-line bg-cream text-ink/70 hover:border-terra/40'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {nearbyFiltered.length ? (
                  <div className="-mx-1 flex-1 space-y-1.5 overflow-y-auto px-1">
                    {nearbyFiltered.map((r) => {
                      const on = nearbyModal.selected.includes(r.name)
                      const tags = [
                        r.cuisine,
                        r.kind === 'cafe' ? 'café' : r.kind === 'fast_food' ? 'fast food' : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                      return (
                        <button
                          key={`${r.name}-${Math.round(r.dist)}`}
                          onClick={() => toggleNearby(r.name)}
                          aria-pressed={on}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                            on
                              ? 'border-terra/50 bg-terra/5'
                              : 'border-line bg-cream hover:border-terra/30'
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                              on
                                ? 'border-terra bg-terra text-white'
                                : 'border-line text-transparent'
                            }`}
                          >
                            ✓
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-ink">{r.name}</span>
                            <span className="block truncate text-xs capitalize text-muted">
                              {tags || 'restaurant'}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-medium text-muted">
                            {formatDistance(r.dist)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="flex-1 rounded-xl border border-line bg-cream px-4 py-6 text-center text-sm text-muted">
                    No matches for that filter.
                  </p>
                )}
              </>
            )}

            <div className="mt-5 flex items-center gap-2">
              <button
                onClick={applyNearby}
                disabled={nearbyModal.status !== 'ok' || nearbyModal.selected.length === 0}
                className="flex-1 rounded-xl bg-gradient-to-br from-terra to-terra-light px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {nearbyModal.status === 'ok' && nearbyModal.selected.length > 0
                  ? `Add ${nearbyModal.selected.length} to spin`
                  : 'Add to spin'}
              </button>
              <button
                onClick={() => setNearbyModal(null)}
                className="rounded-xl border border-line bg-cream px-4 py-3 font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
              >
                Cancel
              </button>
            </div>

            <p className="mt-3 text-center text-[11px] text-muted/70">
              Data © OpenStreetMap contributors
            </p>
          </div>
        </div>
      )}

      {/* Confirm import backup (overwrites current data) */}
      {importConfirm && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#2c2520]/45 p-4 backdrop-blur-sm"
          onClick={() => setImportConfirm(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
            className="animate-pop-in w-full max-w-sm rounded-3xl border border-line bg-surface p-6 text-center shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="import-title" className="font-display text-xl font-semibold text-ink">
              Restore this backup?
            </h3>
            <p className="mt-2 text-sm text-muted">
              It contains {importConfirm['wfd-places-v1'].places.length}{' '}
              {importConfirm['wfd-places-v1'].places.length === 1 ? 'place' : 'places'} and{' '}
              {(importConfirm['wfd-history'] ?? []).length} history{' '}
              {(importConfirm['wfd-history'] ?? []).length === 1 ? 'entry' : 'entries'}. Your
              current places, menus, and history will be replaced.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={confirmImport}
                className="flex-1 rounded-xl bg-gradient-to-br from-terra to-terra-light px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              >
                Restore
              </button>
              <button
                onClick={() => setImportConfirm(null)}
                className="flex-1 rounded-xl border border-line bg-cream px-4 py-3 font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
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
