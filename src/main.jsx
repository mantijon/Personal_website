import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
import { resolvePage } from './routes'
import './styles.css'

const container = document.getElementById('root')
const app = (
  <StrictMode>
    <App initialPath={window.location.pathname} />
  </StrictMode>
)

// Each pre-rendered page is stamped with the page it contains. Hydrate when it
// matches this URL; otherwise (dev server, or a local preview falling back to
// another page's HTML) render from scratch.
if (container.dataset.page === resolvePage(window.location.pathname)) hydrateRoot(container, app)
else createRoot(container).render(app)
