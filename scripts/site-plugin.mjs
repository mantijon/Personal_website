// Vite plugin that turns the normal client build into the full static site.
// After `vite build` writes dist/, it renders every page to HTML
// (prerender.mjs) and checks the result (validate-dist.mjs); a problem fails
// the build. It hooks into `vite build` itself, so `npm run build` and a plain
// `vite build` (whichever Vercel runs) both produce the complete site.
import fs from 'node:fs'
import path from 'node:path'
import { build } from 'vite'
import { createLegacyHashScript } from '../src/legacy-hash.js'
import { prerender } from './prerender.mjs'
import { validateDist } from './validate-dist.mjs'

const SSR_OUT_DIR = 'dist-ssr'

export function sitePlugin() {
  let config

  return {
    name: 'islom-site',

    configResolved(resolved) {
      config = resolved
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace('<!--legacy-hash-script-->', `<script>${createLegacyHashScript()}</script>`)
      },
    },

    async closeBundle() {
      if (config.command !== 'build' || config.build.ssr) return
      const outDir = path.resolve(config.root, config.build.outDir)
      const ssrOutDir = path.resolve(config.root, SSR_OUT_DIR)
      const ssrEntry = path.join(ssrOutDir, 'entry-server.js')

      // Server bundle of the same app, used only to render HTML and then deleted.
      await build({
        configFile: config.configFile,
        root: config.root,
        mode: config.mode,
        logLevel: 'warn',
        build: { ssr: 'src/entry-server.jsx', outDir: SSR_OUT_DIR, emptyOutDir: true, copyPublicDir: false },
      })

      try {
        const pages = await prerender({ outDir, ssrEntry })
        const problems = await validateDist({ root: config.root, outDir, ssrEntry })
        if (problems.length) throw new Error(`Pre-rendered output failed validation:\n  - ${problems.join('\n  - ')}`)
        config.logger.info(`\n✓ pre-rendered ${pages.map((page) => page.pathname).join(', ')} + 404.html, sitemap.xml, robots.txt (validated)`)
      } finally {
        fs.rmSync(ssrOutDir, { recursive: true, force: true })
      }
    },
  }
}
