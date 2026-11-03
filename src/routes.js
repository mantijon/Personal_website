// Public pages and their URLs. Plain ESM (no Vite-only syntax) so the build
// scripts can import it too.

export const SITE_URL = 'https://islom-zokirov.vercel.app'

// No trailing slash except the homepage; vercel.json redirects /books/ to /books.
export const ROUTES = { home: '/', books: '/books', projects: '/projects' }
export const PAGE_IDS = Object.keys(ROUTES)

// The hash routes the site used before path URLs (the old App.jsx accepted
// exactly #home, #books and #projects). The fragment never reaches Vercel, so
// these are forwarded in the browser by the script in legacy-hash.js.
export const LEGACY_HASH_ROUTES = { '#home': '/', '#books': '/books', '#projects': '/projects' }

// Page id for a URL path, or 'notFound'. A trailing slash is tolerated here so
// a local preview of /books/ still shows Books; production redirects it.
export function resolvePage(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return PAGE_IDS.find((id) => ROUTES[id] === path) ?? 'notFound'
}
