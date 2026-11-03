import { createContext, useContext } from 'react'

export const RouterContext = createContext(null)

// A real <a href> (crawlable, works without JavaScript, opens in a new tab
// with modifier keys or a middle click) that switches pages in place on an
// ordinary left click.
export function Link({ to, onClick, ...rest }) {
  const { navigate } = useContext(RouterContext)
  const handleClick = (event) => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={handleClick} {...rest} />
}
