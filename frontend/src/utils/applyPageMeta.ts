import { OG_IMAGE_URL, SITE_NAME, canonicalUrl, type PageMeta } from './pageMeta'

function setMeta(attribute: 'name' | 'property', key: string, content: string | null) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (content === null) {
    element?.remove()
    return
  }
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  element.content = content
}

function setCanonical(href: string | null) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (href === null) {
    link?.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.append(link)
  }
  link.href = href
}

/** Updates title, description, robots, canonical and Open Graph tags for the current page. */
export function applyPageMeta(meta: PageMeta, path: string) {
  const url = meta.noindex ? null : canonicalUrl(path)

  document.title = meta.title
  setMeta('name', 'description', meta.description)
  setMeta('name', 'robots', meta.noindex ? 'noindex' : null)
  setCanonical(url)

  setMeta('property', 'og:title', meta.title)
  setMeta('property', 'og:description', meta.description)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:type', 'website')
  setMeta('property', 'og:site_name', SITE_NAME)
  setMeta('property', 'og:image', OG_IMAGE_URL)
  setMeta('name', 'twitter:card', 'summary_large_image')
}
