// Per-page <head> for public pages: title, description, canonical URL, Open Graph and
// Twitter tags, robots and JSON-LD. Everything is put back on unmount, so the next page
// never inherits a stale canonical.
//
//   useMeta({ title: 'A-level Physics tutors', description, path: '/subjects/a-level-physics', jsonLd })
//
// These tags are set by JavaScript: Google renders them, but link previews (WhatsApp,
// iMessage, LinkedIn, X…) don't run scripts and only see index.html.
import { useEffect } from 'react'
import { SHARE_IMAGE, SITE_NAME } from './site'

// Set VITE_SITE_URL in production so canonical links always name the main domain.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, '')

export const absoluteUrl = (path = '/') =>
  /^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`

/** Set `attr` on the <head> tag whose `keyAttr` is `key`, creating it if needed; returns an undo. */
function setTag(tag, keyAttr, key, attr, value) {
  let el = document.head.querySelector(`${tag}[${keyAttr}="${key}"]`)
  if (el) {
    const previous = el.getAttribute(attr)
    el.setAttribute(attr, value)
    return () => (previous == null ? el.removeAttribute(attr) : el.setAttribute(attr, previous))
  }
  el = document.createElement(tag)
  el.setAttribute(keyAttr, key)
  el.setAttribute(attr, value)
  document.head.appendChild(el)
  return () => el.remove()
}

export default function useMeta({ title, description, path, image = SHARE_IMAGE, type = 'website', jsonLd, noindex = false }) {
  // `<` escaped so text from profiles can never close the script tag if the page is ever prerendered
  const ld = jsonLd ? JSON.stringify(jsonLd).replace(/</g, '\\u003c') : ''

  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME
    const url = absoluteUrl(path ?? window.location.pathname)
    const img = image ? absoluteUrl(image) : null

    const previousTitle = document.title
    document.title = fullTitle

    const tags = [
      ['meta', 'name', 'description', 'content', description],
      ['link', 'rel', 'canonical', 'href', url],
      ['meta', 'name', 'robots', 'content', noindex ? 'noindex, follow' : null],
      ['meta', 'property', 'og:site_name', 'content', SITE_NAME],
      ['meta', 'property', 'og:locale', 'content', 'en_GB'],
      ['meta', 'property', 'og:type', 'content', type],
      ['meta', 'property', 'og:title', 'content', title || SITE_NAME],
      ['meta', 'property', 'og:description', 'content', description],
      ['meta', 'property', 'og:url', 'content', url],
      ['meta', 'property', 'og:image', 'content', img],
      ['meta', 'name', 'twitter:card', 'content', img ? 'summary_large_image' : 'summary'],
      ['meta', 'name', 'twitter:title', 'content', title || SITE_NAME],
      ['meta', 'name', 'twitter:description', 'content', description],
      ['meta', 'name', 'twitter:image', 'content', img],
    ]
    const undo = tags.filter((t) => t[4]).map((t) => setTag(...t))

    let script
    if (ld) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.textContent = ld
      document.head.appendChild(script)
    }

    return () => {
      document.title = previousTitle
      undo.reverse().forEach((fn) => fn())
      script?.remove()
    }
  }, [title, description, path, image, type, ld, noindex])
}
