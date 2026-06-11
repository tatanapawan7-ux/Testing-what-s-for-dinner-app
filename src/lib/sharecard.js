// Render a shareable 1080×1080 PNG of the winning pick on a canvas
// (browser-only, like feedback.js). Returns a Blob, or null when anything
// fails — callers fall back to plain text sharing.

const W = 1080
const H = 1080

// Try to load the food photo with CORS so the canvas stays untainted; resolve
// null (rather than reject) on any failure so the card degrades gracefully.
function loadImage(src) {
  return new Promise((resolve) => {
    if (typeof src !== 'string' || !src || src.startsWith('data:')) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// A small decision-wheel mark (matches the app icon).
function drawWheel(ctx, cx, cy, R) {
  ctx.save()
  ctx.fillStyle = '#f8f3ec'
  ctx.strokeStyle = '#fffdf9'
  ctx.lineWidth = R * 0.06
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = '#d98a4e'
  ctx.lineCap = 'round'
  ctx.lineWidth = R * 0.07
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + R * Math.sin(a), cy - R * Math.cos(a))
    ctx.stroke()
  }
  ctx.fillStyle = '#c2632f'
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.24, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export async function buildShareCard({ name, image }) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Make sure the display font is usable on the canvas (best-effort).
    try {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))])
    } catch {
      // system font fallback is fine
    }
    const display = (size, weight = 700) =>
      `${weight} ${size}px "Space Grotesk Variable", "Inter Variable", system-ui, sans-serif`

    // Warm cream backdrop with soft ambient glows.
    ctx.fillStyle = '#f8f3ec'
    ctx.fillRect(0, 0, W, H)
    let g = ctx.createRadialGradient(140, 0, 0, 140, 0, 700)
    g.addColorStop(0, 'rgba(217,138,78,0.28)')
    g.addColorStop(1, 'rgba(217,138,78,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    g = ctx.createRadialGradient(W, H, 0, W, H, 700)
    g.addColorStop(0, 'rgba(124,138,106,0.22)')
    g.addColorStop(1, 'rgba(124,138,106,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    // Brand row.
    drawWheel(ctx, 96, 96, 44)
    ctx.fillStyle = '#2c2520'
    ctx.font = display(40)
    ctx.textBaseline = 'middle'
    ctx.fillText("What's for Dinner?", 168, 98)

    // Food photo (when CORS allows) in a rounded card.
    const img = await loadImage(image)
    let textTop = 430
    if (img) {
      const x = 120
      const y = 190
      const w = W - 240
      const h = 470
      ctx.save()
      roundRect(ctx, x, y, w, h, 36)
      ctx.clip()
      // cover-fit
      const scale = Math.max(w / img.width, h / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
      ctx.restore()
      ctx.save()
      roundRect(ctx, x, y, w, h, 36)
      ctx.strokeStyle = 'rgba(236,227,213,0.9)'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.restore()
      textTop = 760
    } else {
      drawWheel(ctx, W / 2, 400, 150)
      textTop = 660
    }

    // Eyebrow + winner name (shrink-to-fit, single line).
    ctx.textAlign = 'center'
    ctx.fillStyle = '#c2632f'
    ctx.font = display(34, 600)
    ctx.fillText('T O N I G H T ’ S   P I C K', W / 2, textTop)
    ctx.fillStyle = '#2c2520'
    let size = 110
    ctx.font = display(size)
    while (size > 44 && ctx.measureText(name).width > W - 160) {
      size -= 6
      ctx.font = display(size)
    }
    ctx.fillText(name, W / 2, textTop + 110)

    // Footer.
    ctx.fillStyle = '#7b6f62'
    ctx.font = display(30, 500)
    ctx.fillText('Spin yours → tatanapawan7-ux.github.io/Testing-what-s-for-dinner-app', W / 2, H - 70)

    // Tainted canvases throw here — caught below, caller falls back to text.
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  } catch {
    return null
  }
}
