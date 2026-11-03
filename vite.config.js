import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sitePlugin } from './scripts/site-plugin.mjs'

export default defineConfig({ plugins: [react(), sitePlugin()] })
