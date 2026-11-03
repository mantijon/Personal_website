// Checks the pre-rendered site in dist/ and returns a list of problems (empty
// when everything is fine). Each page must exist, already contain its own
// content, and carry correct lang/title/description/canonical/Open Graph tags;
// every local link and asset must point at a real file.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileForPath } from './prerender.mjs'

const decode = (text) => text
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&')

const attr = (html, regex) => {
  const match = regex.exec(html)
  return match ? decode(match[1]) : null
}

function rootText(html) {
  const start = html.indexOf('<div id="root"')
  const end = html.lastIndexOf('</body>')
  if (start < 0 || end < 0) return ''
  return decode(html.slice(start, end).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

export async function validateDist({ root, outDir, ssrEntry }) {
  const server = await import(`${pathToFileURL(ssrEntry).href}?t=${Date.now()}`)
  const { PAGE_IDS, ROUTES, SITE_URL } = server
  const readData = (name) => JSON.parse(fs.readFileSync(path.join(root, 'src/data', name), 'utf8'))
  const about = readData('about.json')
  const books = readData('books.json')
  const projects = readData('projects.json')
  const problems = []
  const pagePaths = new Set(Object.values(ROUTES))
  const titles = new Map()
  const descriptions = new Map()

  // Compares every path segment with the real directory listing, because macOS
  // ignores letter case but Vercel's file system doesn't (Islom.JPG ≠ islom.jpg).
  const existsWithExactCase = (relative) => {
    let dir = outDir
    for (const segment of relative.split('/').filter(Boolean)) {
      if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory() || !fs.readdirSync(dir).includes(segment)) return false
      dir = path.join(dir, segment)
    }
    return fs.statSync(dir).isFile()
  }

  const localFileExists = (url) => {
    const clean = decodeURI(url.split(/[?#]/)[0])
    return pagePaths.has(clean) || existsWithExactCase(clean)
  }

  const checkLocalReferences = (html, where) => {
    const urls = [
      ...[...html.matchAll(/\s(?:href|src)="(\/[^"]*)"/g)].map((match) => match[1]),
      ...[...html.matchAll(/\ssrcset="([^"]+)"/g)].flatMap((match) => match[1].split(',').map((part) => part.trim().split(/\s+/)[0])),
    ].filter((url) => url.startsWith('/') && !url.startsWith('//'))
    for (const url of new Set(urls)) if (!localFileExists(url)) problems.push(`${where}: local link/asset ${url} does not exist`)
  }

  const mustContain = {
    home: [about.bio, about.focus, ...about.socials.map((social) => social.platform)],
    books: ['Reading List', ...books.map((book) => book.title)],
    projects: ['Portfolio', ...projects.map((project) => project.title), ...projects.map((project) => project.description)],
  }

  for (const page of PAGE_IDS) {
    const pathname = ROUTES[page]
    const file = fileForPath(outDir, pathname)
    const where = path.relative(root, file)
    if (!fs.existsSync(file)) {
      problems.push(`${where}: missing (page "${page}")`)
      continue
    }
    const html = fs.readFileSync(file, 'utf8')
    const canonical = SITE_URL + pathname

    if (html.includes('<!--app-')) problems.push(`${where}: unreplaced template marker`)
    if (!html.includes('<html lang="en">')) problems.push(`${where}: should have <html lang="en">`)
    if (/hreflang=/.test(html)) problems.push(`${where}: should not have hreflang alternates`)

    const title = attr(html, /<title>([^<]*)<\/title>/)
    if (!title) problems.push(`${where}: no <title>`)
    else if (titles.has(title)) problems.push(`${where}: title "${title}" is also used by ${titles.get(title)}`)
    else titles.set(title, where)

    const description = attr(html, /<meta name="description" content="([^"]*)"/)
    if (!description) problems.push(`${where}: no meta description`)
    else if (descriptions.has(description)) problems.push(`${where}: description is also used by ${descriptions.get(description)}`)
    else descriptions.set(description, where)

    if (attr(html, /<link rel="canonical" href="([^"]*)"/) !== canonical) problems.push(`${where}: canonical should be ${canonical}`)
    if ((html.match(/rel="canonical"/g) || []).length !== 1) problems.push(`${where}: should have exactly one canonical link`)
    if (attr(html, /<meta property="og:url" content="([^"]*)"/) !== canonical) problems.push(`${where}: og:url should be ${canonical}`)
    if (attr(html, /<meta property="og:title" content="([^"]*)"/) !== title) problems.push(`${where}: og:title should match <title>`)
    if (attr(html, /<meta property="og:description" content="([^"]*)"/) !== description) problems.push(`${where}: og:description should match the description`)
    const ogImage = attr(html, /<meta property="og:image" content="([^"]*)"/)
    if (!ogImage || !ogImage.startsWith(`${SITE_URL}/`) || !localFileExists(ogImage.slice(SITE_URL.length))) problems.push(`${where}: og:image missing or not a file in dist`)

    if (!html.includes(`<div id="root" data-page="${page}">`)) problems.push(`${where}: root is not stamped data-page="${page}"`)

    // The HTML must already contain this page's own content, before any JavaScript runs.
    const text = rootText(html)
    for (const snippet of mustContain[page]) if (!text.includes(snippet)) problems.push(`${where}: pre-rendered HTML is missing "${snippet.slice(0, 60)}"`)
    const otherHeadings = { home: 'Reading List', books: 'Portfolio', projects: 'Reading List' }
    if (text.includes(otherHeadings[page])) problems.push(`${where}: contains content from another page ("${otherHeadings[page]}")`)

    checkLocalReferences(html, where)
  }

  const notFoundFile = path.join(outDir, '404.html')
  if (!fs.existsSync(notFoundFile)) problems.push('dist/404.html: missing')
  else {
    const html = fs.readFileSync(notFoundFile, 'utf8')
    if (!html.includes('<meta name="robots" content="noindex"')) problems.push('dist/404.html: should be noindex')
    if (html.includes('rel="canonical"')) problems.push('dist/404.html: should not have a canonical link')
    if (!html.includes('<div id="root" data-page="notFound">') || !rootText(html).includes('Page not found')) problems.push('dist/404.html: does not contain the not-found page')
    checkLocalReferences(html, 'dist/404.html')
  }

  const sitemapFile = path.join(outDir, 'sitemap.xml')
  if (!fs.existsSync(sitemapFile)) problems.push('dist/sitemap.xml: missing')
  else {
    const locs = [...fs.readFileSync(sitemapFile, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).sort()
    const wanted = PAGE_IDS.map((page) => SITE_URL + ROUTES[page]).sort()
    if (JSON.stringify(locs) !== JSON.stringify(wanted)) problems.push(`dist/sitemap.xml: should list exactly ${wanted.join(', ')}`)
  }
  const robots = path.join(outDir, 'robots.txt')
  if (!fs.existsSync(robots) || !fs.readFileSync(robots, 'utf8').includes(`Sitemap: ${SITE_URL}/sitemap.xml`)) problems.push('dist/robots.txt: missing or has no Sitemap line')

  // Only the expected pages should exist: no stray HTML from earlier builds.
  const html = fs.readdirSync(outDir, { recursive: true }).filter((file) => String(file).endsWith('.html')).map(String).sort()
  const wantedHtml = [...PAGE_IDS.map((page) => path.relative(outDir, fileForPath(outDir, ROUTES[page]))), '404.html'].sort()
  if (JSON.stringify(html) !== JSON.stringify(wantedHtml)) problems.push(`dist/: unexpected HTML files ${html.filter((file) => !wantedHtml.includes(file)).join(', ')}`)

  return problems
}
