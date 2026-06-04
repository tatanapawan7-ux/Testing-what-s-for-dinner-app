import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Relative base on build so the bundle works under the GitHub Pages subpath
// (https://<user>.github.io/<repo>/) without hard-coding the repo name.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react(), tailwindcss()],
}))
