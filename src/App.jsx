import { useEffect, useRef, useState } from 'react'
import about from './data/about.json'
import books from './data/books.json'
import projects from './data/projects.json'
import imageVariants from './data/image-variants.json'

const routes = ['home', 'books', 'projects']
const projectFilters = ['all', 'completed', 'in-progress']

function getRoute() {
  const route = window.location.hash.replace('#', '')
  return routes.includes(route) ? route : 'home'
}

// Serves a WebP derivative sized to how the image actually renders, falling back
// to the original file. `variant` is tried in order, so a missing size degrades
// to the next best one. See scripts/generate-image-variants.sh.
function Img({ src, variant, alt, ...rest }) {
  const available = imageVariants[src]
  const wanted = Array.isArray(variant) ? variant : [variant]
  const webp = available && wanted.map((name) => available[name]).find(Boolean)

  // Always a <picture> so the DOM shape stays consistent for the CSS.
  return (
    <picture>
      {webp && <source type="image/webp" srcSet={webp} />}
      <img src={src} alt={alt} {...rest} />
    </picture>
  )
}

function Header({ route, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const navigate = (nextRoute) => {
    setMenuOpen(false)
    onNavigate(nextRoute)
  }

  return (
    <header className="site-header">
      <a className="site-mark" href="#home" onClick={() => navigate('home')}>ISA</a>
      <button className="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
        <span /><span />
      </button>
      <nav className={menuOpen ? 'open' : ''} aria-label="Main navigation">
        {routes.map((item) => (
          <a
            key={item}
            className={route === item ? 'active' : ''}
            href={`#${item}`}
            onClick={() => navigate(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </a>
        ))}
      </nav>
    </header>
  )
}

function Eyebrow({ children }) {
  return <p className="eyebrow">{children}</p>
}

function BrandIcon({ platform }) {
  if (platform === 'Telegram') {
    return (
      <svg className="brand-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m6.8 11.8 9.7-4c.45-.18.83.25.64.7l-3.8 8.97c-.18.43-.78.45-1 .04l-1.72-3.2-3.77-1.75c-.38-.18-.4-.6-.05-.76Z" fill="currentColor" />
        <path d="m10.5 13.95 2.1-1.55" fill="none" stroke="#0d0d0d" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    )
  }

  if (platform === 'Instagram') {
    return (
      <svg className="brand-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.4" cy="6.7" r="1.15" fill="currentColor" />
      </svg>
    )
  }

  return <span className="brand-text" aria-hidden="true">in</span>
}

function HomePage() {
  const [firstName, ...lastNameParts] = about.name.split(' ')
  const lastName = lastNameParts.join(' ')
  const bio = about.bio.replace('{city}', about.city)

  return (
    <main className="home-page page-shell">
      <section className="home-content" aria-labelledby="home-title">
        <Eyebrow>Hello, I'm</Eyebrow>
        <h1 id="home-title">{firstName}<br /><em>{lastName}.</em></h1>
        <div className="gold-rule" />
        <div className="intro-copy">
          <p>{bio}</p>
          <p>{about.focus}</p>
        </div>
        <div className="social-row">
          {about.socials.map((social) => (
            <a className="social-link" href={social.url} key={social.platform} target="_blank" rel="noreferrer">
              <span className="social-icon"><BrandIcon platform={social.platform} /></span>
              <span>{social.platform}</span>
            </a>
          ))}
        </div>
      </section>
      <figure className="home-portrait">
        <Img src="/Islom.JPG" variant="hero" alt="Islom Zokirov" width="1400" height="933" fetchPriority="high" decoding="async" />
      </figure>
    </main>
  )
}

function FilterBar({ options, value, onChange }) {
  return (
    <div className="filter-bar" role="group" aria-label="Filter items">
      {options.map((option) => (
        <button
          key={option}
          className={value === option ? 'selected' : ''}
          type="button"
          onClick={() => onChange(option)}
        >
          {option === 'all' ? 'All' : option.replace('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
        </button>
      ))}
    </div>
  )
}

function formatBookDate(date) {
  if (!date) return null
  const [year, month] = date.split('-')
  if (!month) return year
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(Date.UTC(year, Number(month) - 1, 1)))
}

function getBookStatusMeta(book) {
  if (book.status === 'finished') return book.finishedDate ? `Finished · ${formatBookDate(book.finishedDate)}` : 'Finished'
  if (book.status === 'reading') return `Reading · Started ${formatBookDate(book.startedDate)}`
  return 'Want to Read'
}

function BookCover({ book, selected, onSelect, animationDelay }) {
  const shelfStatus = book.status === 'finished' ? null : getBookStatusMeta(book)

  return (
    <button className={`book-item ${selected ? 'selected' : ''}`} type="button" onClick={() => onSelect(book.id)} style={{ animationDelay }}>
      <Img src={book.cover} variant="sm" alt={`${book.title} cover`} width="164" height="219" loading="lazy" decoding="async" />
      {shelfStatus && <span className={`book-status ${book.status}`}>{shelfStatus}</span>}
      <span className="book-title">{book.title}</span>
    </button>
  )
}

function NotesPanel({ book, onClose, panelRef }) {
  const bookMeta = getBookStatusMeta(book)

  return (
    <aside className="notes-panel" ref={panelRef} aria-label={`Notes for ${book.title}`}>
      <Img src={book.cover} variant="sm" alt="" width="164" height="219" loading="lazy" decoding="async" />
      <div className="notes-content">
        <div className="notes-heading">
          <Eyebrow>Notes</Eyebrow>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close notes">×</button>
        </div>
        <h3>{book.title}</h3>
        <p className="muted">{book.author}</p>
        <div className="small-rule" />
        {book.notes ? <p className="notes-text">{book.notes}</p> : <p className="no-notes-state">No notes yet.</p>}
        <p className="book-meta">{bookMeta}</p>
      </div>
    </aside>
  )
}

function CurrentlyReading({ book }) {
  const progress = book ? Math.round((book.currentPage / book.totalPages) * 100) : 0
  const [displayedProgress, setDisplayedProgress] = useState(0)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      setDisplayedProgress(progress)
      return undefined
    }

    setDisplayedProgress(0)
    const frame = window.requestAnimationFrame(() => setDisplayedProgress(progress))
    return () => window.cancelAnimationFrame(frame)
  }, [progress])

  if (!book) return null

  return (
    <section className="reading-card" aria-label="Currently reading">
      <Img src={book.cover} variant="sm" alt={`${book.title} cover`} width="91" height="118" decoding="async" />
      <div className="reading-details">
        <Eyebrow>Currently Reading</Eyebrow>
        <h2>{book.title}</h2>
        <p className="muted">{book.author} · Started {formatBookDate(book.startedDate)}</p>
        <div className="progress-row">
          <div className="progress-track"><span style={{ width: `${displayedProgress}%` }} /></div>
          <span>{progress}%</span>
        </div>
      </div>
    </section>
  )
}

function BooksPage() {
  const [selectedBook, setSelectedBook] = useState(null)
  const [selectionVersion, setSelectionVersion] = useState(0)
  const shelfRef = useRef(null)
  const notesPanelRef = useRef(null)
  const currentBook = books.find((book) => book.status === 'reading')

  useEffect(() => {
    if (!selectedBook) return undefined
    const frame = window.requestAnimationFrame(() => {
      notesPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selectedBook, selectionVersion])

  const selectBook = (id) => {
    setSelectedBook(id)
    setSelectionVersion((version) => version + 1)
  }
  const selected = books.find((book) => book.id === selectedBook)
  const scrollShelf = (amount) => {
    shelfRef.current?.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <main className="page-shell inner-page">
      <div className="page-heading">
        <div><Eyebrow>Reading List</Eyebrow><h1>Books</h1></div>
      </div>
      <CurrentlyReading book={currentBook} />
      <p className="shelf-hint">Click a book to read its notes <span aria-hidden="true">—</span></p>
      <div className="shelf-wrap">
        <button className="shelf-arrow left" type="button" onClick={() => scrollShelf(-320)} aria-label="Scroll books left">‹</button>
        <div className="book-shelf" ref={shelfRef}>
          {books.map((book, index) => <BookCover key={book.id} book={book} selected={book.id === selectedBook} onSelect={selectBook} animationDelay={`${index * 60}ms`} />)}
        </div>
        <button className="shelf-arrow right" type="button" onClick={() => scrollShelf(320)} aria-label="Scroll books right">›</button>
      </div>
      {selected && <NotesPanel book={selected} panelRef={notesPanelRef} onClose={() => setSelectedBook(null)} />}
    </main>
  )
}

function Lightbox({ images, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [currentIndex, images.length])

  const handleNext = (e) => {
    e?.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const handlePrev = (e) => {
    e?.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const isPdf = images[currentIndex]?.toLowerCase().endsWith('.pdf')

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" type="button" onClick={onClose} aria-label="Close Lightbox">×</button>
      {images.length > 1 && (
        <button className="lightbox-arrow left" type="button" onClick={handlePrev} aria-label="Previous Image">‹</button>
      )}
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {isPdf ? (
          <iframe src={images[currentIndex]} className="lightbox-pdf-viewer" title="PDF Document" />
        ) : (
          <Img src={images[currentIndex]} variant={['lg', 'md']} alt={`Project image ${currentIndex + 1}`} decoding="async" />
        )}
        <div className="lightbox-caption">{currentIndex + 1} / {images.length}</div>
      </div>
      {images.length > 1 && (
        <button className="lightbox-arrow right" type="button" onClick={handleNext} aria-label="Next Image">›</button>
      )}
    </div>
  )
}

function ProjectCard({ project, animationDelay }) {
  const hasImages = project.images && project.images.length > 0
  const [activeImgIndex, setActiveImgIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const isPdf = project.url?.endsWith('.pdf')
  const hasLiveLink = Boolean(project.url) && project.url !== '#' && !isPdf

  const mainImage = hasImages ? project.images[activeImgIndex] : null
  const isMainImagePdf = mainImage?.toLowerCase().endsWith('.pdf')

  return (
    <article className="project-card" style={{ animationDelay }}>
      {hasImages && (
        <div className="project-gallery-container">
          <div className="project-main-image-wrapper" onClick={() => setLightboxOpen(true)}>
            {isMainImagePdf ? (
              <div className="project-pdf-preview-card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="pdf-preview-icon">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span className="pdf-preview-text">Open Internship Document</span>
                <span className="pdf-preview-subtext">Click to view certificate</span>
              </div>
            ) : (
              <Img src={mainImage} variant="md" alt={project.title} className="project-main-image" width="1400" height="875" loading="lazy" decoding="async" />
            )}
            <div className="image-zoom-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="zoom-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
          </div>
          {project.images.length > 1 && (
            <div className="project-thumbnails">
              {project.images.map((img, index) => {
                const isThumbPdf = img.toLowerCase().endsWith('.pdf')
                return (
                  <button
                    key={img}
                    type="button"
                    className={`project-thumbnail-btn ${index === activeImgIndex ? 'active' : ''}`}
                    onMouseEnter={() => setActiveImgIndex(index)}
                    onClick={() => setActiveImgIndex(index)}
                  >
                    {isThumbPdf ? (
                      <div className="pdf-thumbnail">
                        <span>PDF</span>
                      </div>
                    ) : (
                      <Img src={img} variant="thumb" alt="" width="72" height="52" loading="lazy" decoding="async" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {isPdf && !hasImages && (
        <div className="pdf-attachment-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pdf-icon">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>PDF Attachment Included</span>
        </div>
      )}

      <div className="project-topline"><span>{project.dateRange}</span><span className={`status ${project.status}`}>{project.statusLabel}</span></div>
      {project.role && <p className="project-role">{project.role}</p>}
      <h2>{project.title}</h2>
      <p className="project-description">{project.description}</p>
      {isPdf && (
        <a className="learn-link" href={project.url} target="_blank" rel="noreferrer">
          View PDF Document <span aria-hidden="true">↗</span>
        </a>
      )}
      {hasLiveLink && (
        <a className="learn-link" href={project.url} target="_blank" rel="noreferrer">
          Visit Live Site <span aria-hidden="true">↗</span>
        </a>
      )}

      {lightboxOpen && (
        <Lightbox
          images={project.images}
          initialIndex={activeImgIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </article>
  )
}

function ProjectsPage() {
  const [filter, setFilter] = useState('all')
  const visibleProjects = filter === 'all' ? projects : projects.filter((project) => project.status === filter)

  return (
    <main className="page-shell inner-page projects-page">
      <div className="page-heading">
        <div><Eyebrow>Portfolio</Eyebrow><h1>Projects</h1></div>
        <FilterBar options={projectFilters} value={filter} onChange={setFilter} />
      </div>
      <section className="project-grid" aria-label="Projects">
        {visibleProjects.map((project, index) => <ProjectCard key={project.id} project={project} animationDelay={`${index * 80}ms`} />)}
      </section>
    </main>
  )
}

export default function App() {
  const [route, setRoute] = useState(getRoute)

  useEffect(() => {
    const updateRoute = () => setRoute(getRoute())
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  const navigate = (nextRoute) => {
    if (window.location.hash !== `#${nextRoute}`) window.location.hash = nextRoute
    setRoute(nextRoute)
  }

  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight
      setScrollProgress(scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0)
    }
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => { window.removeEventListener('scroll', updateProgress); window.removeEventListener('resize', updateProgress) }
  }, [route])

  return <div className="app"><div className="scroll-progress" style={{ height: `${scrollProgress}%` }} aria-hidden="true" /><Header route={route} onNavigate={navigate} /><div className="route-view" key={route}>{route === 'home' && <HomePage />}{route === 'books' && <BooksPage />}{route === 'projects' && <ProjectsPage />}</div></div>
}
