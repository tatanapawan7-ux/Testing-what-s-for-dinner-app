import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// Relative base on build so the bundle works under the GitHub Pages subpath
// (https://<user>.github.io/<repo>/) without hard-coding the repo name.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [
    react(),
    tailwindcss(),
    // Offline support: precache the app shell so the wheel, menus, and
    // history (all localStorage-backed) work with no connection. We keep our
    // hand-written public/manifest.webmanifest (manifest: false).
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
        globIgnores: ['og.png'], // social-share card; only scrapers fetch it
        navigateFallback: 'index.html',
      },
    }),
  ],
}))
