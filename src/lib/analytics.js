// Privacy-friendly, cookieless page analytics via GoatCounter — loaded only
// when a site code is configured at build time (VITE_GOATCOUNTER) and the
// visitor hasn't asked not to be tracked. A no-op otherwise, so the app ships
// tracker-free by default. (Browser-only; not unit-tested.)
export function initAnalytics() {
  const endpoint = import.meta.env.VITE_GOATCOUNTER
  if (!endpoint) return // analytics disabled unless explicitly configured
  if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return
  const s = document.createElement('script')
  s.async = true
  s.src = 'https://gc.zgo.at/count.js'
  s.dataset.goatcounter = endpoint
  document.head.appendChild(s)
}
