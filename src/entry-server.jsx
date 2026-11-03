// Used only at build time by scripts/prerender.mjs to turn every page into
// static HTML. It renders the same <App> as the browser.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import { PAGE_IDS, ROUTES, SITE_URL, resolvePage } from './routes'
import { getHead, renderHead } from './seo'

export function render(pathname) {
  const page = resolvePage(pathname)
  const html = renderToString(
    <StrictMode>
      <App initialPath={pathname} />
    </StrictMode>,
  )
  const head = getHead(page)
  return { page, html, head, headHtml: renderHead(head) }
}

export { PAGE_IDS, ROUTES, SITE_URL }
