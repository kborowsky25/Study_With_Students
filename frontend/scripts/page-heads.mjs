// After `vite build`: give every public page in src/lib/site.js its own HTML file
// (dist/about/index.html for /about, which the host serves before the app's catch-all)
// with that page's title and description in <head>, plus its canonical address. Search
// engines and link previews that don't run JavaScript then see the right page; the app is
// the same bundle on every page.
//
// dist/index.html is the homepage and also the catch-all for every other route (tutor
// profiles, the signed-in app), so it gets no canonical address: those pages set their own
// in the browser (lib/useMeta.js).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { PAGES, SITE_NAME, SITE_ORIGIN } from '../src/lib/site.js'

const dist = new URL('../dist/', import.meta.url)
// index.html's comment about this script is for readers of the source, not the built pages
const template = readFileSync(new URL('index.html', dist), 'utf8').replace(/\n *<!--[\s\S]*?-->/, '')
const attr = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** `html` with `pattern` replaced; fails the build if index.html stopped matching. */
function swap(html, pattern, replacement) {
  if (!pattern.test(html)) throw new Error(`page-heads: ${pattern} isn't in dist/index.html`)
  return html.replace(pattern, replacement)
}

function head(path, { title, description }) {
  let html = swap(template, /<title>[^<]*<\/title>/, `<title>${attr(`${title} · ${SITE_NAME}`)}</title>`)
  for (const key of ['name="description"', 'property="og:description"', 'name="twitter:description"']) {
    html = swap(html, new RegExp(`(<meta ${key} content=")[^"]*`), `$1${attr(description)}`)
  }
  for (const key of ['property="og:title"', 'name="twitter:title"']) {
    html = swap(html, new RegExp(`(<meta ${key} content=")[^"]*`), `$1${attr(title)}`)
  }
  if (path !== '/') {
    const url = `${SITE_ORIGIN}${path}`
    html = swap(html, /( *)<meta property="og:type"/, `$1<link rel="canonical" href="${url}" />\n$1<meta property="og:url" content="${url}" />\n$1<meta property="og:type"`)
  }
  return html
}

for (const [path, page] of Object.entries(PAGES)) {
  const file = path === '/' ? new URL('index.html', dist) : new URL(`.${path}/index.html`, dist)
  mkdirSync(new URL('.', file), { recursive: true })
  writeFileSync(file, head(path, page))
}
console.log(`page-heads: ${Object.keys(PAGES).length} pages`)
