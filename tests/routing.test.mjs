// Run with `npm test` (Node's built-in test runner, no extra packages).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import vm from 'node:vm'
import { createLegacyHashScript } from '../src/legacy-hash.js'
import { LEGACY_HASH_ROUTES, ROUTES, resolvePage } from '../src/routes.js'

test('every page path resolves to its page', () => {
  for (const [page, path] of Object.entries(ROUTES)) assert.equal(resolvePage(path), page)
})

test('unknown and old locale paths are not pages', () => {
  for (const path of ['/nope', '/books/extra', '/uz/', '/ru/books', '/index.html', '/books.html']) assert.equal(resolvePage(path), 'notFound', path)
})

test('a trailing slash is tolerated (production redirects it)', () => {
  assert.equal(resolvePage('/books/'), 'books')
  assert.equal(resolvePage('/projects/'), 'projects')
})

// Runs the inline <head> script against a fake browser and reports what it did.
function runLegacyScript(url) {
  const parsed = new URL(url, 'https://example.test')
  const calls = []
  const sandbox = {
    location: { pathname: parsed.pathname, search: parsed.search, hash: parsed.hash, replace: (to) => calls.push(['replace', to]) },
    history: { state: null, replaceState: (_state, _title, to) => calls.push(['replaceState', to]) },
    document: { documentElement: { style: {} } },
  }
  vm.runInNewContext(createLegacyHashScript(), sandbox)
  return calls
}

test('old hash links load the matching page', () => {
  assert.deepEqual(runLegacyScript('/#books'), [['replace', '/books']])
  assert.deepEqual(runLegacyScript('/#projects'), [['replace', '/projects']])
})

test('old #home link just drops the hash', () => {
  assert.deepEqual(runLegacyScript('/#home'), [['replaceState', '/']])
})

test('the query string is kept', () => {
  assert.deepEqual(runLegacyScript('/?ref=telegram#books'), [['replace', '/books?ref=telegram']])
  assert.deepEqual(runLegacyScript('/?ref=telegram#home'), [['replaceState', '/?ref=telegram']])
})

test('ordinary anchors and other pages are left alone', () => {
  for (const url of ['/#home-title', '/#', '/', '/books#books', '/projects#projects', '/#/books']) assert.deepEqual(runLegacyScript(url), [], url)
})

test('only the hash routes the old site used are forwarded', () => {
  assert.deepEqual(Object.keys(LEGACY_HASH_ROUTES).sort(), ['#books', '#home', '#projects'])
})
