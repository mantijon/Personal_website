// <head> metadata for each page. The pre-render writes it into the HTML
// (renderHead) and the browser keeps it in sync after in-app navigation
// (applyHead), so both come from the same data.
import about from './data/about.json'
import { ROUTES, SITE_URL } from './routes.js'

const PAGE_META = {
  home: {
    title: about.name,
    description: 'Personal website of Islom Zokirov, a cybersecurity student who builds websites, Telegram bots and small platforms.',
  },
  books: {
    title: `Books · ${about.name}`,
    description: "Islom Zokirov's reading list, with a short summary of each book.",
  },
  projects: {
    title: `Projects · ${about.name}`,
    description: 'Projects and roles of Islom Zokirov, from an AI hackathon and a bank cybersecurity internship to school media, an IT club, volleyball and an environmental network.',
  },
  notFound: {
    title: `Page not found · ${about.name}`,
    description: "This page doesn't exist.",
  },
}

// The portrait already used on the homepage, as the social preview image.
const OG_IMAGE = { url: `${SITE_URL}/Islom.JPG`, width: '1400', height: '933' }

export function getHead(page) {
  const { title, description } = PAGE_META[page]
  const head = { title, description, meta: [{ name: 'description', content: description }], links: [] }

  // Not-found responses are never indexed.
  if (page === 'notFound') {
    head.meta.push({ name: 'robots', content: 'noindex' })
    return head
  }

  const canonical = SITE_URL + ROUTES[page]
  head.canonical = canonical
  head.links.push({ rel: 'canonical', href: canonical })
  head.meta.push(
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: about.name },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonical },
    { property: 'og:image', content: OG_IMAGE.url },
    { property: 'og:image:width', content: OG_IMAGE.width },
    { property: 'og:image:height', content: OG_IMAGE.height },
    { property: 'og:image:alt', content: about.name },
    { name: 'twitter:card', content: 'summary_large_image' },
  )
  return head
}

const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const attributes = (tag) => Object.entries(tag).map(([name, value]) => `${name}="${escapeHtml(value)}"`).join(' ')

// Tags carry data-head so applyHead can find and replace exactly these.
export function renderHead(head) {
  return [
    `<title>${escapeHtml(head.title)}</title>`,
    ...head.meta.map((tag) => `<meta ${attributes(tag)} data-head>`),
    ...head.links.map((tag) => `<link ${attributes(tag)} data-head>`),
  ].join('\n    ')
}

export function applyHead(head) {
  document.title = head.title
  document.head.querySelectorAll('[data-head]').forEach((node) => node.remove())
  const fragment = document.createDocumentFragment()
  for (const [tagName, tags] of [['meta', head.meta], ['link', head.links]]) {
    for (const tag of tags) {
      const element = document.createElement(tagName)
      for (const [name, value] of Object.entries(tag)) element.setAttribute(name, value)
      element.setAttribute('data-head', '')
      fragment.appendChild(element)
    }
  }
  document.head.appendChild(fragment)
}
