import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root,
  plugins: [react()],
  server: { port: 9002, strictPort: true },
  build: { outDir: resolve(root, '../../dist'), emptyOutDir: true }
})
