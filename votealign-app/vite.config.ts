import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The MAEday site has no build step, so the built voter guide is committed
// to ../vote and served at /vote/. Run `npm run build` here after any change.
// base: './' keeps asset paths relative so it works from any folder.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: '../vote', emptyOutDir: true },
})
