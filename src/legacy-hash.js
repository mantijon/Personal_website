// Inline <head> script that forwards the old hash links (/#books) to the new
// pages (/books) before anything renders. It is injected by
// scripts/site-plugin.mjs so the route list lives only in routes.js.
//
// - Only the homepage is checked, because that's where every old link pointed.
// - Only the exact old route hashes are forwarded; other anchors are left alone.
// - A full navigation (location.replace) fetches the right pre-rendered page;
//   /#home is already the homepage, so it only drops the hash.
// - The query string is kept.
import { LEGACY_HASH_ROUTES } from './routes.js'

export function createLegacyHashScript() {
  return `(function (routes) {
  if (location.pathname !== '/' || !Object.prototype.hasOwnProperty.call(routes, location.hash)) return;
  var target = routes[location.hash];
  if (target === '/') { history.replaceState(history.state, '', '/' + location.search); return; }
  document.documentElement.style.visibility = 'hidden';
  location.replace(target + location.search);
})(${JSON.stringify(LEGACY_HASH_ROUTES)});`
}
