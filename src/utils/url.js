/**
 * 站内链接要带上部署子路径（GitHub Pages 项目页是 /<repo>/），
 * 站外链接原样返回。
 */
export function resolveUrl(url = '') {
  if (!url) return ''
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) return url
  if (!url.startsWith('/')) return url
  return `${import.meta.env.BASE_URL.replace(/\/$/, '')}${url}`
}

export function isInternal(url = '') {
  return Boolean(url) && url.startsWith('/') && !url.startsWith('//')
}
