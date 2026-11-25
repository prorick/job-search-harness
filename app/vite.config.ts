import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves this repo at https://<user>.github.io/job-search-harness/ — ADR-0001.
// Override with BASE_PATH (e.g. "/") for a custom domain or a different host.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/job-search-harness/',
  plugins: [react()],
})
