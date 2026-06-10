// Celebration + sound + haptic feedback (no assets; Web Audio & canvas-confetti).
import confetti from 'canvas-confetti'

// Warm confetti to match the cream theme.
const CONFETTI_COLORS = ['#d2703a', '#e0a458', '#8e9b7c', '#c98b6b', '#a6603c', '#fffdfa']

const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Best-effort haptic buzz (Android/Chrome; a no-op where unsupported). Honours
// the same mute toggle as sound, so "mute" means a fully calm spin.
export function vibrate(pattern) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    // best-effort
  }
}

// A short celebratory confetti burst over the winner modal.
export function celebrate() {
  if (prefersReducedMotion()) return
  const opts = { spread: 70, startVelocity: 45, ticks: 200, zIndex: 100, colors: CONFETTI_COLORS }
  confetti({ ...opts, particleCount: 80, origin: { x: 0.5, y: 0.6 } })
  confetti({ ...opts, particleCount: 40, angle: 60, origin: { x: 0, y: 0.7 } })
  confetti({ ...opts, particleCount: 40, angle: 120, origin: { x: 1, y: 0.7 } })
}

// A self-contained "ta-da" chime via Web Audio — no audio asset needed.
let audioCtx = null
export function getAudioContext() {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  return audioCtx
}

export function playFanfare() {
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
export function playWhoosh() {
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
export function playTick() {
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
