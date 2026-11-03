// Writes one static HTML file per page into dist/, plus 404.html, sitemap.xml
// and robots.txt. Called by scripts/site-plugin.mjs after the client build;
// `ssrEntry` is the server build of src/entry-server.jsx.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// URL path -> file Vercel serves for it (cleanUrls: /books -> books.html).
export function fileForPath(outDir, pathname) {
  return path.join(outDir, pathname === '/' ? 'index.html' : `${pathname}.html`)
}

const MARKERS = { head: '<!--app-head-->', root: '<div id="root"><!--app-html--></div>' }

export async function prerender({ outDir, ssrEntry }) {
  const server = await import(`${pathToFileURL(ssrEntry).href}?t=${Date.now()}`)
  const template = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8')
  for (const marker of Object.values(MARKERS)) {
    if (!template.includes(marker)) throw new Error(`dist/index.html has no ${marker} (was it already pre-rendered?)`)
  }

  // Function replacers keep "$&"-style sequences in content from being
  // interpreted by String#replace.
  const toHtml = (pathname) => {
    const { page, html, headHtml } = server.render(pathname)
    return {
      page,
      html: template
        .replace(MARKERS.head, () => headHtml)
        .replace(MARKERS.root, () => `<div id="root" data-page="${page}">${html}</div>`),
    }
  }

  const pages = []
  for (const page of server.PAGE_IDS) {
    const pathname = server.ROUTES[page]
    const result = toHtml(pathname)
    if (result.page !== page) throw new Error(`${pathname} rendered "${result.page}" instead of "${page}"`)
    const file = fileForPath(outDir, pathname)
    fs.writeFileSync(file, result.html)
    pages.push({ page, pathname, file })
  }

  // Vercel serves 404.html, with a 404 status, for any path without a file.
  fs.writeFileSync(path.join(outDir, '404.html'), toHtml('/404').html)

  const site = server.SITE_URL
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map(({ pathname }) => `  <url><loc>${site}${pathname}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n'))
  fs.writeFileSync(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`)

  return pages
}
