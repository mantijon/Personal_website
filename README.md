# Islom Zokirov Personal Website

A static React + Vite personal website built from the supplied Figma Make reference.

## Run locally

```bash
npm install
npm run dev      # development server
npm run build    # production build into dist/ (pre-rendered, see below)
npm run preview  # serve dist/ locally
npm test         # routing and legacy-link tests
```

## Pages

| Page | URL |
| --- | --- |
| Home | `/` |
| Books | `/books` |
| Projects | `/projects` |

Unknown paths get the 404 page (`dist/404.html`, served by Vercel with a 404 status).
The old hash links (`/#home`, `/#books`, `/#projects`) still work: a tiny script in
`src/legacy-hash.js` forwards them to the new URLs before the page renders.

Content is editable in `src/data/`, while the artwork lives in `public/covers/` and
`public/projects/`. Page titles, descriptions and social-preview tags are in `src/seo.js`.

## How the build works

`vite build` first builds the browser app as usual. A small plugin
(`scripts/site-plugin.mjs`) then renders every page to static HTML with React's own
server renderer (`scripts/prerender.mjs`), writes `404.html`, `sitemap.xml` and
`robots.txt`, and checks the result (`scripts/validate-dist.mjs`). The build fails if a
page is missing, has the wrong content or metadata, or links to a file that doesn't exist.
In the browser, React then hydrates the pre-rendered HTML instead of drawing the page
from scratch, so content is visible before JavaScript finishes loading.

To add a page: add its URL to `src/routes.js`, its title and description to
`src/seo.js`, and render it in `src/App.jsx`. The build picks it up automatically.

Fonts (DM Sans, Playfair Display) are self-hosted from `src/assets/fonts/` under the
SIL Open Font License (licence files in the same folder).
